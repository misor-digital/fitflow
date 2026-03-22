interface Step {
  num: number;
  title: string;
  desc: string;
}

interface HowItWorksProps {
  steps: Step[];
  bgClass?: string;
}

export default function HowItWorks({ steps, bgClass = 'bg-gradient-to-b from-white to-gray-50' }: HowItWorksProps) {
  return (
    <section className={`py-10 sm:py-12 md:py-16 px-4 sm:px-5 ${bgClass}`}>
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-brand-navy)] text-center mb-8 sm:mb-10 md:mb-12 relative after:content-[''] after:block after:w-12 sm:after:w-16 after:h-1 after:bg-[var(--color-brand-orange)] after:mx-auto after:mt-3 sm:after:mt-4 after:rounded">
        Как работи
      </h2>
      <div className="max-w-lg mx-auto space-y-6 sm:space-y-8">
        {steps.map((step) => (
          <div key={step.num} className="relative bg-white p-5 sm:p-6 md:p-8 rounded-2xl shadow-lg border-l-4 border-[var(--color-brand-orange)] hover:-translate-y-1 hover:shadow-xl transition-all">
            <div className="absolute -top-3 sm:-top-4 left-4 sm:left-5 w-10 h-10 sm:w-12 sm:h-12 bg-[var(--color-brand-orange)] text-white rounded-full flex items-center justify-center text-lg sm:text-xl font-bold shadow-lg">
              {step.num}
            </div>
            <div className="mt-3 sm:mt-4">
              <h3 className="text-lg sm:text-xl font-semibold text-[var(--color-brand-navy)] mb-1 sm:mb-2">{step.title}</h3>
              <p className="text-sm sm:text-base text-gray-600">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
