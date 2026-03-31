# FinPay B2B Gateway - Developer API Documentation

Bienvenue sur la documentation d'API de FinPay. 
Ce guide est destiné aux ingénieurs et développeurs des banques partenaires (Bankily, Wave, etc.) souhaitant intégrer la couche de paiement automatisée avec la plateforme FinPay.

## Protocole de Sécurité
Tous les appels API dirigés vers nos serveurs nécessitent un **API Key** strictement confidentiel.
Il doit être envoyé dans l'en-tête (Header) de chaque requête HTTP sous la clé `x-api-key`.

- **Base URL:** `https://finpay.today/api/b2b`
- **Header Requis:** `x-api-key: fp_live_*******************`

> ⚠️ N'exposez jamais cette clé dans vos applications mobiles frontales (Android/iOS). Vos requêtes vers FinPay doivent s'effectuer serveur-à-serveur (Back-to-Back).

---

## 1. Vérifier la Dette d'une Facture (LOOKUP)
Permet à votre système de vérifier le montant exact qu'un citoyen doit à FinPay pour une facture donnée avant d'autoriser le débit.

**Endpoint:** `GET /lookup/:invoiceId`

**Exemple de Requête (cURL):**
```bash
curl -X GET "https://finpay.today/api/b2b/lookup/INV-12345" \
     -H "x-api-key: votre_cle_secrete"
```

**Exemple de Réponse Réussie (200 OK):**
```json
{
    "status": "PENDING",
    "customerName": "Ahmed Fall",
    "invoiceCategory": "electricity",
    "totalDueRemaining": 7500,
    "currency": "MRU",
    "installmentsPending": 2
}
```

---

## 2. Déclarer un Paiement Validé (PAY / PULL)
Une fois que vous avez débité le compte du citoyen dans votre propre système bancaire, appelez ce webhook pour déclarer le paiement réussi. FinPay soldera automatiquement la ligne de crédit du citoyen.

**Endpoint:** `POST /pay`

**Body (JSON) Requis:**
```json
{
    "invoiceId": "INV-12345",
    "amountPaid": 7500,
    "transactionRef": "BNK_9283749283"
}
```
*`transactionRef`: Le numéro de référence unique de la transaction dans votre propre base de données.*

**Exemple de Réponse Réussie (200 OK):**
```json
{
    "message": "Payment successfully logged and reconciled automatically.",
    "paymentId": "pay_9f8d...",
    "remainingInstallments": 1
}
```

---

## Assistance & Support Technique
Pour tout problème d'intégration serveur-à-serveur avec l'API Webhook, contactez l'administrateur système de FinPay par l'email fourni lors de la génération de vos clés.
