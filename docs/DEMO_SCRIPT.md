# Demo video script (target: 2:30)

**Before recording**
- Make a fresh account and click **Load sample items** so the dashboard is full.
- Have a real receipt nearby (or any receipt photo on your computer) for the "add item" step.
- Browser zoom at 110–125% so text is readable in the video. Close other tabs.
- Use a free recorder: OBS, Loom, or the built-in recorder (Win+Alt+R on Windows, Cmd+Shift+5 on Mac).

---

### 0:00 – 0:20 · The problem
*Show the login page.*

> "My headphones stopped working last week. Two questions: where's the receipt, and is it still under warranty? Most people can't answer either one. Warranty Wallet fixes that."

*Log in.*

### 0:20 – 0:50 · The dashboard
*Slowly move across the stats, then the cards.*

> "This is my wallet. Every purchase I've saved, sorted by which warranty ends first. Green means covered, yellow means it ends within 90 days, red means it's expired. Up top I can see I've got over three thousand dollars of stuff still under warranty, and my stand mixer runs out in 25 days, so if anything's wrong with it, now's the time."

*Click the **Expiring soon** tab, then **All** again.*

### 0:50 – 1:30 · Add an item
*Click **+ Add item**.*

> "Adding something takes a few seconds."

*Type a name (e.g. "Nintendo Switch 2"), store, price. Pick a category. Set the purchase date. Tap **1 year**.*

> "As I fill it in, it already works out the end date and how long is left."

*Upload or snap the receipt. Click **Save item**.*

> "The receipt goes into Appwrite Storage, and only I can see it."

### 1:30 – 2:10 · The payoff
*Go back to the wallet. Type "headphones" in search. Open the item.*

> "Back to my headphones. I search, open it, and there's my answer: still covered, 143 days left, with the receipt right next to it. That's the screen I show at the store."

*Click **Copy claim details**, paste into a notepad or email for a second.*

> "If I need to email support, one tap copies everything they'll ask for: serial number, store, date, price."

*Click **Remind me 30 days before** and show the calendar file opening.*

> "And I can drop a reminder into my calendar a month before coverage ends."

### 2:10 – 2:30 · How it's built
*Optional: show the Appwrite Console with the `items` table and its rows.*

> "It's built on Appwrite TablesDB. Every purchase is a row, with the warranty end date stored so the dashboard is a single sorted query. Receipts are in Appwrite Storage, and row-level permissions mean each person only ever sees their own items. That's Warranty Wallet."
