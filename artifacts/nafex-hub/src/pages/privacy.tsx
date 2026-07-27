import { Link } from "wouter";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] py-12 font-poppins">
      <div className="container mx-auto max-w-3xl px-4 md:px-8">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-[#6B7280]">
          <Link href="/" className="hover:text-[#6A1B9A] transition-colors">Home</Link>
          <span className="mx-2">›</span>
          <span className="text-[#222222] font-medium">Privacy Policy</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-purple-100/60 p-8 md:p-12 space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-[#222222]">Privacy Policy</h1>
            <p className="text-sm text-[#6B7280]">Last updated: July 2026</p>
          </div>

          <p className="text-[#4B5563] leading-relaxed">
            At <span className="font-semibold text-[#6A1B9A]">Nafex Hub</span>, we are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and safeguard your data when you use our platform.
          </p>

          {[
            {
              title: "1. Information We Collect",
              content: `We collect information you provide directly to us when you create an account, make a purchase, or contact us. This includes your name, email address, phone number, delivery address, and payment details. We also automatically collect certain technical data such as IP address, browser type, device information, and usage activity on our platform.`
            },
            {
              title: "2. How We Use Your Information",
              content: `We use the information we collect to process transactions and deliver orders, send transactional and promotional communications, improve our platform and personalise your experience, detect and prevent fraud or security threats, comply with legal obligations, and respond to customer support queries.`
            },
            {
              title: "3. Sharing Your Information",
              content: `We do not sell or rent your personal information to third parties. We may share your data with trusted service providers who assist us in operating our platform (such as payment processors, logistics partners, and cloud services), with law enforcement where legally required, and with business partners only with your consent.`
            },
            {
              title: "4. Payment Security",
              content: `All payment transactions on Nafex Hub are processed through secure, encrypted channels (Paystack). We do not store your full card details. Our platform uses escrow-based payment protection to ensure both buyers and sellers are safeguarded during every transaction.`
            },
            {
              title: "5. Cookies",
              content: `We use cookies and similar technologies to keep you signed in, remember your preferences, and analyse platform usage. You can control cookie settings through your browser, though disabling them may affect some features of our platform.`
            },
            {
              title: "6. Data Retention",
              content: `We retain your personal data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time by contacting us at nafexgroupltd@gmail.com.`
            },
            {
              title: "7. Your Rights",
              content: `You have the right to access, correct, or delete your personal information. You may also object to or restrict certain processing of your data. To exercise these rights, please contact our support team.`
            },
            {
              title: "8. Children's Privacy",
              content: `Our platform is not directed at children under the age of 13. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal information, we will delete it promptly.`
            },
            {
              title: "9. Changes to This Policy",
              content: `We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through a notice on our platform. Continued use of Nafex Hub after changes constitutes your acceptance of the updated policy.`
            },
            {
              title: "10. Contact Us",
              content: `If you have any questions or concerns about this Privacy Policy, please contact us at nafexgroupltd@gmail.com or visit our Help Centre.`
            },
          ].map((section) => (
            <div key={section.title} className="space-y-2">
              <h2 className="text-lg font-semibold text-[#222222]">{section.title}</h2>
              <p className="text-[#4B5563] leading-relaxed text-sm">{section.content}</p>
            </div>
          ))}

          <div className="pt-4 border-t border-purple-100">
            <p className="text-xs text-[#6B7280]">
              For any questions, email us at{" "}
              <a href="mailto:nafexgroupltd@gmail.com" className="text-[#6A1B9A] hover:underline">
                nafexgroupltd@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
