const calculatePenalty = (installment, invoiceAmount) => {
    // Si l'échéance est déjà payée, on renvoie la pénalité qui a été enregistrée au moment du paiement
    if (installment.status === 'PAID') {
        return installment.penaltyApplied || 0;
    }

    const now = new Date();
    const due = new Date(installment.dueDate);

    // Si on n'a pas encore dépassé la date d'échéance, pas de pénalité
    if (now <= due) {
        return 0;
    }

    // Calcul du nombre de mois entamés de retard
    // On calcule la différence en jours et on divise par 30
    const diffTime = Math.abs(now - due);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Chaque mois commencé (même un jour de retard = 1 mois) compte.
    const monthsLate = Math.ceil(diffDays / 30);

    // La pénalité est de 5% du montant de la facture originale par mois de retard
    const penalty = invoiceAmount * 0.05 * monthsLate;

    return penalty;
};

module.exports = { calculatePenalty };
