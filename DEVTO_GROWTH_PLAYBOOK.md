# dev.to Growth Playbook — funneling readers to RapidAPI

Goal: every post is a top-of-funnel asset for a RapidAPI listing. dev.to distributes through its feed algorithm (early reactions/comments matter most), tag pages, follower notifications, and — the long tail — Google, since dev.to has huge domain authority.

## What's already in place (2026-07-03)
- Profile rebranded around "60 APIs in 60 days", website link → RapidAPI provider page, work/skills/hacking-on fields filled, 10 tags followed.
- Series "60 APIs in 60 Days" created; both posts in it with cross-link footers + follow CTA.

## Per-post checklist (do this for every launch post)
1. **Title formula** — pick one:
   - Outcome + hook: "How to X before Y (Free API)"
   - Contrarian build story: "I built X because paying for Y is silly"
   - Numbers: "X costs $300/seat. I rebuilt the core signal for $0"
2. **Tags**: `#showdev` + `#api` always; 3rd/4th tag from the post's audience (webdev, python, automation, saas, buildinpublic, sideprojects). Never waste a slot on a tag with <1k followers.
3. **Cover image**: always (posts with covers get ~2x feed CTR). 1000x420.
4. **First 2 sentences** carry the feed preview — problem + $ number beats intro fluff.
5. **One copy-pasteable curl** in the first screen. Real response data, not `{...}`.
6. **CTA block**: free-tier size + "no card required" + RapidAPI link. One link, repeated max twice.
7. **Series footer**: Day N framing + links to previous days + "Follow me" CTA.
8. **Liquid embed**: add `{% embed <previous post url> %}` instead of a bare link when referencing earlier posts — renders a rich card.
9. Publish **Mon–Thu, 13:00–15:00 UTC** (9–11am ET) — peak dev.to traffic window.

## Weekly engagement routine (15 min/day — this is what actually unlocks the feed)
dev.to's algorithm weighs author reputation: comments written, reactions given, follower engagement. A silent account gets throttled.
- Comment on 3–5 posts/day in #api, #showdev, #buildinpublic — substantive comments (a gotcha, a question, a benchmark), never "great post!".
- React to ~10 posts/day in your tags.
- Reply to every comment on your posts within a few hours — comment count is a ranking input, and each reply doubles it.
- Follow authors who write about APIs/SaaS; many follow back, and followers see your new posts in their feed + notifications.

## Series mechanics
- Keep the exact series name "60 APIs in 60 Days" on every post — dev.to matches by string.
- Series posts show prev/next navigation automatically once ≥2 posts — free internal traffic.
- Every ~7 days, publish a recap post: "Week N of 60 APIs in 60 Days: what shipped, revenue, lessons". Recaps consistently outperform launch posts on #buildinpublic and pull readers into the whole series.

## Post types that outperform launch announcements
Launch posts convert but don't spread. Alternate with:
1. **War stories**: "USAspending.gov has contracts ending in year 8201. Here's how I paginated around it" — the FCI cursor hack is a ready-made banger.
2. **Cost breakdowns**: "My 3-API stack runs on $0/month: Supabase Edge + Render free tier" — #devops #serverless crowd.
3. **Comparisons**: "Email validation APIs in 2026: what $0.0025/lookup actually buys you" — SEO magnet, ranks on Google.
4. **Numbers posts**: "30 days, 30 APIs, $X MRR" — build-in-public catnip.

## Distribution beyond the feed
- Cross-post to Hashnode/Medium with `canonical_url` pointing at dev.to (keeps SEO consolidated).
- Every dev.to post URL goes in: RapidAPI listing description, GitHub repo README, LinkedIn/Reddit posts (Jul 6 push).
- Add UTM params to RapidAPI links (`?utm_source=devto&utm_medium=post&utm_campaign=day-N`) so you can attribute which posts convert.

## Metrics to watch (dev.to/dashboard)
Views → reactions ratio (>5% is healthy), followers/week, and RapidAPI listing visits from devto UTM. If a post gets <100 views in 48h it never entered the feed — usually weak first-2-sentences or dead-zone publish time; edit and re-check rather than delete.
