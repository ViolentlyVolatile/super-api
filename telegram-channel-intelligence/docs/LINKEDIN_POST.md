# LinkedIn post — Telegram Channel Intelligence

NOTE before posting: verify the public RapidAPI listing URL resolves (see note in REDDIT_POSTS.md — assumed rapidapi.com/karan-WuSc97Oof/api/telegram-channel-intelligence, not explicitly confirmed in memory). Space this post a few hours or a full day from any other Super API LinkedIn post going out around the same time.

---

Shipped: Telegram Channel Intelligence API 🚀

Telegram has roughly a billion monthly users — huge public crypto, news, and brand communities — but no official API to read a channel you don't own. The Bot API only sees chats your bot is in; MTProto means standing up a full client session.

Turns out every public channel is already served as a plain, logged-out webpage. So I built an API around it:

✅ Channel profile: title, description, verified status, subscriber count (parsed to a real integer), media counters
✅ Recent posts: text, views, reactions, media, link previews, forward info
✅ Cursor pagination and keyword filtering across posts
✅ Single-post lookup by ID
✅ 100% public, logged-out data — no accounts, no bot tokens, nothing private

Free tier: 50 requests/month. Paid from $5/month.

Use cases: monitoring crypto/trading channels, OSINT and threat intelligence, influencer vetting, competitor tracking, news aggregation.

Try it: https://rapidapi.com/karan-WuSc97Oof/api/telegram-channel-intelligence

#API #OSINT #BuildInPublic #DataIntelligence #SaaS

---

**Engagement notes:** reply to every comment. Crypto/trading and marketing folks are the most likely to convert — offer to run a sample channel through it if they ask.
