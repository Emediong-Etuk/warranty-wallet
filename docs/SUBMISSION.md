# Submission form text (copy and paste)

**Project name**
Warranty Wallet

**Tagline**
Never lose a receipt. Never miss a warranty.

**Database used**
TablesDB

**Description**
Warranty Wallet keeps every receipt in one place and shows how long each warranty has left. You add a purchase (name, store, price, date, warranty length) and snap the receipt. The dashboard sorts everything by which warranty ends first, with green, yellow and red badges, and shows how much money is still covered. When something breaks, you search for it and instantly see "covered, 143 days left" next to the receipt. One tap copies the details a support team asks for, and another adds a calendar reminder 30 days before coverage ends.

**How it uses Appwrite**
Each purchase is a row in an Appwrite TablesDB table. The warranty end date is stored as a datetime column, and a composite index on (userId, warrantyEndsAt) lets the dashboard load with one sorted query. Receipts are stored in a private, encrypted Appwrite Storage bucket. Appwrite Auth handles accounts, and row and file security make sure each person can only see their own items. A setup script creates the whole schema (database, table, columns, index, bucket) with the Appwrite Node SDK.

**Repository**
https://github.com/<your-username>/warranty-wallet

**Demo video**
<YouTube or Loom link>

**Live demo (optional)**
<your deployed URL>
