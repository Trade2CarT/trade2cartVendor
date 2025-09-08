import React from 'react';

// A wrapper for consistent styling
const PolicyWrapper = ({ children }) => (
    <div className="space-y-4 text-gray-600 prose max-w-none">
        {children}
    </div>
);

export const TermsAndConditions = () => (
    <>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Trade2Cart Vendor Terms & Conditions</h2>
        <PolicyWrapper>
            <p><strong>Effective Date:</strong> 01 October 2025</p>
            <p><strong>Trial Period:</strong> 01 October 2025 – 30 November 2025 (extendable only until 31 December 2025)</p>
            <p><strong>Last Updated:</strong> 08 September 2025</p>
            <p>These Terms & Conditions (“Terms”) govern the participation of vendors (“Vendor”, “You”) in the Trade2Cart Platform (“Platform”, “We”, “Us”, “Our”). By registering as a vendor and accepting assignments, you agree to comply with these Terms.</p>

            <h3>1. Role of Trade2Cart</h3>
            <ul>
                <li>Trade2Cart acts solely as a mediator between users (customers) and vendors.</li>
                <li>Trade2Cart does not purchase or sell scrap.</li>
                <li>Vendors are independent entities responsible for pricing, payments, and collections.</li>
            </ul>

            <h3>2. Vendor Eligibility</h3>
            <ul>
                <li>Vendors must provide accurate details (business name, ID proof, GST if applicable, and contact information).</li>
                <li>Vendors must comply with all local scrap collection, recycling, and environmental laws.</li>
                <li>Vendors must maintain valid licenses/permits (if required).</li>
            </ul>

            <h3>3. Assignment of Orders</h3>
            <ul>
                <li>Vendors will receive pickup requests via Trade2Cart admin assignment.</li>
                <li>Orders are assigned based on location, availability, and performance history.</li>
                <li>Trade2Cart reserves the right to reassign orders if vendors fail to respond/collect on time.</li>
            </ul>

            <h3>4. Payments & Settlements</h3>
            <ul>
                <li>Vendors must pay users directly at the time of scrap pickup.</li>
                <li>Vendors are required to settle service fees/commission with Trade2Cart after the trial period ends.</li>
                <li>Daily settlement reminders will be sent. If dues are unpaid, next-day orders will not be assigned.</li>
                <li>Trade2Cart may suspend or terminate vendor access for non-payment of service fees.</li>
            </ul>

            <h3>5. Free Trial Period (Launch Offer)</h3>
            <ul>
                <li>A free trial period is offered only during platform launch.</li>
                <li>Trial Period: 01 October 2025 – 30 November 2025.</li>
                <li>Extension (if announced): maximum till 31 December 2025.</li>
                <li>After 31 December 2025, all vendors, old or new, will be required to pay commission/service fees.</li>
                <li>This free trial is not available for future vendors who join after the above dates.</li>
            </ul>

            <h3>6. Vendor Obligations</h3>
            <ul>
                <li>Treat customers respectfully and professionally.</li>
                <li>Offer fair and transparent scrap rates (no cheating, fraud, or under-weighing).</li>
                <li>Complete pickups on the scheduled date and time.</li>
                <li>Ensure accurate weighing machines and avoid unfair practices.</li>
                <li>Report any disputes or issues immediately to Trade2Cart.</li>
            </ul>

            <h3>7. Prohibited Activities</h3>
            <ul>
                <li>Misrepresent themselves as Trade2Cart employees.</li>
                <li>Engage in illegal activities (e.g., stolen goods, hazardous waste not allowed by law).</li>
                <li>Use abusive behavior toward customers or staff.</li>
                <li>Share user data for unauthorized purposes.</li>
            </ul>

            <h3>8. Commission & Fees (Post-Trial)</h3>
            <ul>
                <li>From 01 December 2025 (or 01 January 2026 if extended), Trade2Cart will charge a service/commission fee per order.</li>
                <li>Fee structure will be communicated in advance and updated from time to time.</li>
                <li>Failure to pay commission will result in suspension of vendor account.</li>
            </ul>

            <h3>9. Suspension & Termination</h3>
            <p>Vendor access may be suspended or terminated if:</p>
            <ul>
                <li>Payments to users or Trade2Cart are not settled.</li>
                <li>Complaints of fraud, misconduct, or poor service are verified.</li>
                <li>Vendor violates these Terms or applicable laws.</li>
            </ul>

            <h3>10. Liability Disclaimer</h3>
            <ul>
                <li>Trade2Cart is not responsible for disputes between users and vendors.</li>
                <li>Vendors are solely responsible for pricing, payments, and compliance with laws.</li>
                <li>Trade2Cart acts only as a facilitator of connections.</li>
            </ul>

            <h3>11. Data & Privacy</h3>
            <ul>
                <li>Vendors must not misuse customer information.</li>
                <li>Trade2Cart may collect and use vendor data for platform operations, compliance, and analytics.</li>
            </ul>

            <h3>12. Dispute Resolution</h3>
            <ul>
                <li>Any disputes between users and vendors must be resolved directly.</li>
                <li>Trade2Cart may provide mediation support but holds no liability.</li>
                <li>For vendor-platform disputes, the matter will be subject to [Your City/State] jurisdiction.</li>
            </ul>

            <h3>13. Amendments</h3>
            <p>Trade2Cart reserves the right to update these Terms at any time. Vendors will be notified of major changes via app/email/WhatsApp. Continued use of the platform means acceptance of revised terms.</p>
        </PolicyWrapper>
    </>
);

export const PrivacyPolicy = () => (
    <>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Trade2Cart Vendor Privacy Policy</h2>
        <PolicyWrapper>
            <p><strong>Effective Date:</strong> 01 October 2025</p>
            <p><strong>Last Updated:</strong> 08 September 2025</p>
            <p>This Privacy Policy explains how Trade2Cart (“We”, “Us”, “Our”) collects, stores, and uses information provided by vendors (“You”, “Vendor”) when you register and operate on the Trade2Cart Platform.</p>
            <p>By using the Platform, you agree to this Privacy Policy.</p>

            <h3>1. Information We Collect</h3>
            <p>We may collect the following information from vendors:</p>
            <ul>
                <li>Business details (business name, license/permit copies, GST number if applicable).</li>
                <li>Personal identification documents (Aadhar, PAN, voter ID, or equivalent).</li>
                <li>Contact information (mobile number, address, email).</li>
                <li>Bank account/payment details (for settlement purposes).</li>
                <li>Performance data (pickup history, complaints, rating).</li>
                <li>Device/IP logs when accessing the platform.</li>
            </ul>

            <h3>2. Purpose of Collection</h3>
            <p>We use vendor information strictly for:</p>
            <ul>
                <li>Verification and approval of vendors.</li>
                <li>Assignment and tracking of pickup requests.</li>
                <li>Communication between Trade2Cart and vendors.</li>
                <li>Payment settlements and commission collection.</li>
                <li>Compliance with legal, tax, and regulatory obligations.</li>
                <li>Monitoring vendor performance and dispute management.</li>
            </ul>

            <h3>3. Data Sharing</h3>
            <ul>
                <li>Vendor details (such as name, phone number, and location) are shared only with users who book pickups.</li>
                <li>We may share vendor data with government/regulatory authorities if legally required.</li>
                <li>We do not sell vendor data to third parties.</li>
            </ul>

            <h3>4. Vendor Responsibilities</h3>
            <p>Vendors must:</p>
            <ul>
                <li>Keep their data accurate and updated.</li>
                <li>Maintain confidentiality of customer data received via Trade2Cart.</li>
                <li>Not misuse, resell, or share customer information for unauthorized purposes.</li>
                <li>Report any data breach or misuse immediately to Trade2Cart.</li>
            </ul>

            <h3>5. Data Retention</h3>
            <ul>
                <li>Trade2Cart retains vendor data only as long as required for business, legal, or compliance purposes.</li>
                <li>Upon vendor termination, data may be archived but not used for commercial purposes.</li>
            </ul>

            <h3>6. Protection of Trade2Cart</h3>
            <ul>
                <li>Vendors are solely responsible for any misuse, fraud, or unlawful activity they engage in with user/customer data.</li>
                <li>Trade2Cart will not be held liable for any vendor misconduct, data breach, or unauthorized data sharing.</li>
                <li>Vendors agree to indemnify and hold Trade2Cart harmless against claims, damages, or legal proceedings arising out of vendor actions.</li>
            </ul>

            <h3>7. Vendor Rights</h3>
            <p>Vendors may request:</p>
            <ul>
                <li>A copy of the personal/business data stored with Trade2Cart.</li>
                <li>Correction of inaccurate data.</li>
                <li>Deletion of data (subject to legal and business obligations).</li>
            </ul>

            <h3>8. Policy Updates</h3>
            <p>Trade2Cart reserves the right to update this Privacy Policy at any time. Vendors will be notified of significant changes through app/email/WhatsApp. Continued use of the platform constitutes acceptance of the revised policy.</p>
        </PolicyWrapper>
    </>
);