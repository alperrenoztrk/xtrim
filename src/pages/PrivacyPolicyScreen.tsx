import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PrivacyPolicyScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      <header className="flex items-center gap-3 p-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Gizlilik Politikası</h1>
      </header>

      <main className="p-4 pb-20 space-y-6">
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Marine Expert, denizcilik öğrencileri ve denizdeki denizciler için etkileşimli eğitim
            içerikleri, tablolar, grafikler ve hesaplamalar sunan bir mobil uygulamadır. Bu politika,
            uygulamayı kullanırken hangi verilerin işlendiğini ve bu verilerin nasıl korunduğunu
            açıklar.
          </p>
          <p className="text-sm text-muted-foreground">Son güncelleme: 16 Mart 2025</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">Toplanan Veriler</h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Uygulama ayarları:</span> Dil, tema, dışa
              aktarma tercihleri ve benzeri ayarlar yalnızca cihazınızda saklanır.
            </li>
            <li>
              <span className="font-medium text-foreground">Kullanıcı içerikleri:</span> Projeler,
              hesaplama girdileri ve oluşturduğunuz çıktılar cihazınızda tutulur.
            </li>
            <li>
              <span className="font-medium text-foreground">Çalışma verileri:</span> Uygulama içi
              performansı iyileştirmek için cihazınızın sunduğu genel hata ve performans bilgileri
              kullanılabilir.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">Verilerin Kullanımı</h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Eğitim içeriklerini kişiselleştirmek ve uygulamayı daha verimli hale getirmek.</li>
            <li>Uygulama kararlılığını artırmak ve hataları tespit etmek.</li>
            <li>Kullanıcı deneyimini geliştirmek için temel kullanım istatistiklerini değerlendirmek.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">Veri Paylaşımı</h2>
          <p className="text-sm text-muted-foreground">
            Marine Expert, kişisel verilerinizi üçüncü taraflara satmaz. Uygulama içinde kullanılan
            hizmetlerin bazıları (ör. hata raporlama) yalnızca hizmetin çalışması için gerekli minimum
            veriyi işleyebilir. Bu hizmetler, sadece uygulama kalitesini artırmak amacıyla kullanılır.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">YZ Özellikleri (Beta)</h2>
          <p className="text-sm text-muted-foreground">
            YZ destekli özellikler isteğe bağlıdır ve Ayarlar bölümünden açılıp kapatılabilir. Bu
            özellikleri etkinleştirdiğinizde, ilgili işlemler için gerekli veriler işlenebilir. YZ
            özellikleri kapalı olduğunda bu işlemler devre dışıdır.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">Veri Güvenliği</h2>
          <p className="text-sm text-muted-foreground">
            Verilerin güvenliğini sağlamak için teknik ve organizasyonel önlemler alınır. Uygulama
            ayarları ve kullanıcı içerikleri öncelikle cihazınızda saklanır ve sizin kontrolünüzdedir.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">Haklarınız</h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Uygulama ayarlarınızı dilediğiniz zaman değiştirebilir veya sıfırlayabilirsiniz.</li>
            <li>İçeriklerinizi cihazınızdan silebilir ve tekrar oluşturabilirsiniz.</li>
            <li>YZ özelliklerini tamamen devre dışı bırakabilirsiniz.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">İletişim</h2>
          <p className="text-sm text-muted-foreground">
            Gizlilik politikasıyla ilgili sorularınız için lütfen uygulama destek kanalı üzerinden
            bizimle iletişime geçin.
          </p>
        </section>
      </main>
    </div>
  );
};

export default PrivacyPolicyScreen;
