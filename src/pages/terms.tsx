import { Link } from "wouter";

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] py-12 font-poppins">
      <div className="container mx-auto max-w-3xl px-4 md:px-8">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-[#6B7280]">
          <Link href="/" className="hover:text-[#6A1B9A] transition-colors">Home</Link>
          <span className="mx-2">›</span>
          <span className="text-[#222222] font-medium">Terms & Conditions</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-purple-100/60 p-8 md:p-12 space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-[#222222]">Terms & Conditions</h1>
            <p className="text-sm text-[#6B7280]">Last updated: July 2026</p>
          </div>

          <p className="text-[#4B5563] leading-relaxed">
            Welcome to <span className="font-semibold text-[#6A1B9A]">Nafex Hub</span>. By accessing or using our platform, you agree to be bound by these Terms & Conditions. Please read them carefully before using our services.
          </p>

          {[
            {
              title: "1. Acceptance of Terms",
              content: `By registering for or using Nafex Hub, you confirm that you are at least 18 years of age, have read and understood these Terms, and agree to comply with them. If you do not agree, please do not use our platform.`
            },
            {
              title: "2. Platform Description",
              content: `Nafex Hub is an online marketplace connecting buyers and sellers across Ghana and beyond. We provide the technology infrastructure for transactions but are not a party to the transactions between buyers and sellers. We offer escrow payment protection, logistics support, and dispute resolution services.`
            },
            {
              title: "3. User Accounts",
              content: `You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must provide accurate and complete information when registering. Nafex Hub reserves the right to suspend or terminate accounts that violate these Terms.`
            },
            {
              title: "4. Seller Obligations",
              content: `Sellers on Nafex Hub must list only genuine, accurately described products. Sellers are responsible for fulfilling orders promptly, maintaining adequate stock levels, and responding to buyer enquiries in a timely manner. Sellers may not engage in price manipulation, fake reviews, or any fraudulent activity.`
            },
            {
              title: "5. Buyer Obligations",
              content: `Buyers must provide accurate delivery information and complete payments in good faith. Buyers must raise any disputes within the specified timeframe after delivery. Nafex Hub's escrow system holds payments securely until the buyer confirms receipt or the dispute resolution period expires.`
            },
            {
              title: "6. Payments & Escrow",
              content: `All transactions are processed through our secure escrow system powered by Paystack. Funds are released to sellers after the buyer confirms receipt or after the dispute window closes. Nafex Hub charges a service commission on each completed transaction, as detailed in our Seller Fee Schedule.`
            },
            {
              title: "7. Returns & Refunds",
              content: `Buyers may raise a dispute or return request within 48 hours of confirmed delivery for items that are significantly not as described, damaged, or counterfeit. Refunds are processed through the same payment method used at checkout. Sellers are notified and may respond to disputes before a resolution is reached.`
            },
            {
              title: "8. Prohibited Conduct",
              content: `You may not use Nafex Hub to list counterfeit, stolen, or illegal goods; engage in harassment or abusive behaviour toward other users; manipulate reviews or ratings; attempt to bypass our payment system; or scrape, hack, or interfere with platform operations.`
            },
            {
              title: "9. Intellectual Property",
              content: `All content on Nafex Hub, including our logo, design, and technology, is owned by or licensed to Nafex Hub. You may not reproduce, distribute, or create derivative works without our written permission. Sellers retain ownership of their product content but grant Nafex Hub a licence to display it on the platform.`
            },
            {
              title: "10. Limitation of Liability",
              content: `Nafex Hub is not liable for any indirect, incidental, or consequential damages arising from your use of the platform. Our total liability to you for any claim shall not exceed the value of the transaction giving rise to the claim. We do not guarantee uninterrupted or error-free platform operation.`
            },
            {
              title: "11. Governing Law",
              content: `These Terms are governed by and construed in accordance with the laws of the Republic of Ghana. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Ghana.`
            },
            {
              title: "12. Changes to Terms",
              content: `We may update these Terms from time to time. We will notify you of material changes by email or in-platform notice. Continued use of Nafex Hub after updates constitutes acceptance of the revised Terms.`
            },
            {
              title: "13. Contact Us",
              content: `For questions about these Terms, please contact us at legal@nafexhub.com or through our Help Centre.`
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
              <a href="mailto:legal@nafexhub.com" className="text-[#6A1B9A] hover:underline">
                legal@nafexhub.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
