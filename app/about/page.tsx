import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function AboutPage() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-[#b3e0f7] via-[#d4ebf7] via-[#fde8d5] to-[#fcd5a8] pt-24 pb-16 px-5">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-[#023047] text-center mb-12 md:mb-16 relative after:content-[''] after:block after:w-16 after:h-1 after:bg-[#FB7D00] after:mx-auto after:mt-4 after:rounded">
            За нас
          </h1>

          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            {/* Photo Placeholder */}
            <div className="w-full max-w-sm md:max-w-md lg:w-96 flex-shrink-0 md:order-2">
              <div className="aspect-square bg-gradient-to-br from-[#FB7D00] to-[#ff9a3d] rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden">
                <div className="text-white text-center p-8">
                  <p className="text-lg font-medium">Вашата снимка тук</p>
                </div>
                {/* Replace with: <img src="/path-to-photo.jpg" alt="Симона" className="w-full h-full object-cover" /> */}
              </div>
            </div>

            {/* Story Content */}
            <div className="flex-1 md:order-1 space-y-6">
              <p className="text-base md:text-lg leading-relaxed text-[#333] font-semibold">
                Аз съм Симона и спортът е моят наркотик. Играя баскетбол през целия си съзнателен живот, както и вдигам тежко във фитнеса от няколко години. А! Също така започнах да практикувам йога и стречинг преди няколко години, за да не съм дърво с болежки на 22.
              </p>

              <p className="text-base md:text-lg leading-relaxed text-[#333] font-semibold">
                И както се правя на силна във фитнеса, пръскам на баскетболния терен или се разтягам като ластик на постелката, изведнъж мотивацията ми си тръгва като бивша на семейно събиране – без дори да каже „чао".
              </p>

              <p className="text-base md:text-lg leading-relaxed text-[#333] font-semibold">
                Знам, че тази злочест не сполетява само мен и тогава ми светна лампата 💡 да създам спортна абонаментна кутия, която да е моята подкрепа. Е, така казано звучи странно, обаче не е така. <span className="text-[#FB7D00] font-bold">FitFlow</span> събира всичко необходимо за спорта на едно място – удобни дрешки, протеинови вкуснотиики, спортни аксесоарчета, добавчици, за да сме здрави и прави, плюс нови предизвикателства.
              </p>

              <p className="text-base md:text-lg leading-relaxed text-[#333] font-semibold">
                Тя e начин да се чувстваме вдъхновени, да сме активни и да се грижим за себе си с удоволствие. И да задържи мотивацията, когато тръгне да се прибира!
              </p>

              <p className="text-base md:text-lg leading-relaxed text-[#333] font-semibold">
                И нали знаеш престиж? Ядеш сега или гориш. Така че поръчвай преди да са ни изкупили!
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
