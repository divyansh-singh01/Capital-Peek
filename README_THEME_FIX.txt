Capital Peek dashboard theme fix

This patch fixes the dashboard theme toggle, which previously appeared not to work because the dashboard CSS forced dark colors even when the <html> element was in light mode. The animated tunnel background also had a hard-coded dark canvas.

Files in this patch are relative to your project root (the folder containing package.json):
  src/styles.css
  src/components/GoldenTunnelBackground.tsx

Apply safely:
1. Stop the local dev server with Ctrl+C.
2. Extract this ZIP directly into your existing project root, the folder containing package.json (likely CapitalPeek_ROI_Report\cp\cp).
3. If Windows asks whether to replace files, choose Replace the files in the destination. Only the two files listed above are included.
4. Do NOT replace or delete your .env file. This patch does not contain your credentials or database migrations.
5. Restart with: npm.cmd run dev
6. Open the local URL, go to the dashboard, and click the sun/moon button. Test light mode, dark mode, navigating between dashboard pages, and refreshing.

This patch changes only dashboard styles and the animated background's theme-aware colors. It does not configure Google OAuth or modify Supabase credentials.
