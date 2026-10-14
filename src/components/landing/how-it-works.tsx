const STEPS = [
  {
    step: "01",
    title: "Enter your business numbers",
    body: "Add your sales and marketing spend, number of leads, close rate, average deal value and team size. Use real figures when you have them, or clearly labelled estimates.",
  },
  {
    step: "02",
    title: "Explore a possible change",
    body: "Adjust your expected improvement to see how projected revenue and estimated payback may change. These are scenarios, not promises.",
  },
  {
    step: "03",
    title: "Save and track your plan",
    body: "Save different scenarios, follow deals through your pipeline and compare your estimates with the results your business achieves.",
  },
  {
    step: "04",
    title: "Share a clear report",
    body: "Download a PDF showing your results and assumptions, or invite teammates to work together in a shared workspace.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-t border-border/70 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="type-section-title">How it works</h2>
          <p className="mt-3 text-muted-foreground">Four simple steps to turn your business assumptions into a plan you can review.</p>
        </div>
        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((item) => (
            <li
              key={item.step}
              className="relative rounded-2xl border border-border/70 bg-card p-6 shadow-soft"
            >
              <span className="text-xs font-semibold tracking-widest text-primary">{item.step}</span>
              <h3 className="mt-3 text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
