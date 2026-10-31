<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Accounts use username login mapped to a synthetic email (`<username>@sonicnews.app`, see src/lib/sonic.ts) with auto-confirm; never send auth emails.
- Avatars are stored as small JPEG data URLs in `profiles.avatar_url` because public storage buckets are blocked in this workspace.
- Time-machine news is AI-generated server-side and cached per year in `year_news`; the year range is computed from the current date, never hardcoded.
- Quiz answers remain in protected database tables; authenticated transactional RPCs award coins once per answer and atomically redeem owned titles, preventing replay and overspending.
- Games and shop use separate Sonic tab components; equipped titles are read from profiles so account, friend lists and chats display the same selection.
