const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Middleware to verify the Bank API Key from Headers
const verifyBankAPIKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'Missing x-api-key header.' });
    }

    try {
        const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
        
        const bank = await prisma.partnerBank.findFirst({
            where: { apiKeyHash: hash, isActive: true }
        });

        if (!bank) {
            return res.status(403).json({ error: 'Invalid or deactivated API Key.' });
        }

        req.bank = bank; // Attach the authenticated bank to the request
        next();
    } catch (error) {
        console.error('Erreur API Gateway B2B:', error);
        res.status(500).json({ error: 'Gateway Internal Error' });
    }
};

// ==========================================
// B2B ENDPOINTS (SILENT PING)
// ==========================================

// 1. LOOKUP: Bank pings this with an Invoice Number or Phone number to check debt
router.get('/lookup/:invoiceId', verifyBankAPIKey, async (req, res) => {
    try {
        const { invoiceId } = req.params;

        const plan = await prisma.repaymentPlan.findUnique({
            where: { invoiceId },
            include: {
                invoice: { include: { user: true } },
                installments: true
            }
        });

        if (!plan) {
            return res.status(404).json({ error: 'Invoice or Repayment Plan not found.' });
        }

        // Si le plan est OVERDUE ou ACTIVE, on trouve les échéances impayées
        const pendingInstallments = plan.installments.filter(i => i.status !== 'PAID');
        
        let totalDue = 0;
        pendingInstallments.forEach(i => {
            totalDue += i.amount + i.penaltyApplied;
        });

        if (totalDue === 0) {
            return res.json({ 
                status: 'CLEARED', 
                message: 'No remaining debt for this invoice.' 
            });
        }

        // Return exact amount to the Bank
        res.json({
            status: 'PENDING',
            customerName: `${plan.invoice.user.firstName} ${plan.invoice.user.lastName}`,
            invoiceCategory: plan.invoice.category,
            totalDueRemaining: totalDue,
            currency: 'MRU',
            installmentsPending: pendingInstallments.length
        });

    } catch (error) {
        res.status(500).json({ error: 'Erreur interne de vérification' });
    }
});

// 2. PAY (WEBHOOK): Bank triggers this when money is successfully pulled/deducted
router.post('/pay', verifyBankAPIKey, async (req, res) => {
    try {
        const { invoiceId, amountPaid, transactionRef } = req.body;

        if (!invoiceId || !amountPaid || !transactionRef) {
            return res.status(400).json({ error: 'invoiceId, amountPaid, and transactionRef are required.' });
        }

        const plan = await prisma.repaymentPlan.findUnique({
            where: { invoiceId },
            include: { installments: true }
        });

        if (!plan) {
            return res.status(404).json({ error: 'Repayment Plan not found.' });
        }

        const pendingInstallments = plan.installments.filter(i => i.status !== 'PAID');

        if (pendingInstallments.length === 0) {
            return res.status(400).json({ error: 'This invoice is already fully paid.' });
        }

        // Logic here: In a real environment, you would accurately split the `amountPaid`
        // across the pending installments. For this gateway, we assume the Bank pays off the oldest pending installment exactly.
        const targetInstallment = pendingInstallments[0]; // Take the earliest unpaid

        // Create the automated Payment record silently!
        const payment = await prisma.payment.create({
            data: {
                installmentId: targetInstallment.id,
                amount: amountPaid,
                method: `B2B_API_${req.bank.name}`, // Identifier that the partner bank paid it!
                status: 'APPROVED', // Insta-approved! No human admin needed.
                reviewedAt: new Date(),
                proofUrl: transactionRef // We store the Bank's Transaction ID as proof
            }
        });

        // Mark installment as paid
        await prisma.installment.update({
            where: { id: targetInstallment.id },
            data: { status: 'PAID' }
        });

        // Check if all are paid now
        const updatedPlan = await prisma.repaymentPlan.findUnique({
            where: { invoiceId },
            include: { installments: true }
        });

        const allPaid = updatedPlan.installments.every(i => i.status === 'PAID');
        if (allPaid) {
            await prisma.repaymentPlan.update({
                where: { invoiceId },
                data: { status: 'COMPLETED' }
            });
            await prisma.invoice.update({
                where: { id: invoiceId },
                data: { status: 'FULLY_REPAID' }
            });
        }

        res.json({
            message: 'Payment successfully logged and reconciled automatically.',
            paymentId: payment.id,
            remainingInstallments: allPaid ? 0 : (pendingInstallments.length - 1)
        });

    } catch (error) {
        console.error('Erreur Gateway Payment:', error);
        res.status(500).json({ error: 'Payment Registration Failed' });
    }
});

module.exports = router;
