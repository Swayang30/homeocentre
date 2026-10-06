import re, json, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
p = 'src/login.html'; s = open(p, encoding='utf-8').read()
s = re.sub(r'<ul class="hc-stack">.*?</ul>', '''<ul class="hc-stack">
          <li><svg class="hc-icon" aria-hidden="true"><use href="#i-pin"/></svg><span>Save your name, mobile number and delivery address once.</span></li>
          <li><svg class="hc-icon" aria-hidden="true"><use href="#i-heart"/></svg><span>Keep a wishlist of the remedies you use.</span></li>
          <li><svg class="hc-icon" aria-hidden="true"><use href="#i-phone"/></svg><span>Need help? Call <a class="hc-tlink" href="tel:+918017371453">+91 8017371453</a>.</span></li>
        </ul>''', s, flags=re.S)
open(p, 'w', encoding='utf-8').write(s)

def C(t): return '<p><span class="hc-confirm">CLIENT TO CONFIRM: ' + t + '</span></p>'
MAILTEL = '<a href="tel:+918017371453">+91 8017371453</a> or email <a href="mailto:homeocenter@gmail.com">homeocenter@gmail.com</a>'
POL = {
 'privacy-policy.html': ('Privacy Policy', 'How Homoeo Centre collects, uses and protects your information.', [
   ('collect', 'Information we collect', '<p>When you create an account or place an order we ask for your name, email, mobile number and delivery address. Prescription orders also include the patient&rsquo;s details, the doctor&rsquo;s name and mobile number, and the prescription file you upload.</p>' + C('full list of data collected, including anything collected by analytics or the hosting provider')),
   ('use', 'How we use it', '<p>We use these details to prepare and deliver your order, to call you before dispatch, and to answer your questions.</p>' + C('any other uses, such as order updates by SMS or email newsletters')),
   ('prescriptions', 'Prescriptions and health information', '<p>Your prescription stays confidential. It is read by our licensed pharmacist to prepare your order.</p>' + C('how long prescription files are kept and how they are deleted')),
   ('sharing', 'Sharing with others', C('who receives order data (courier partner, payment provider once added) and a statement that data is not sold')),
   ('browser', 'Cookies and browser storage', '<p>The site remembers your delivery PIN code in your browser so product pages can check delivery for you. You can clear it at any time from your browser settings.</p>' + C('cookies used by the PHP session and any analytics')),
   ('rights', 'Your choices', C('how customers can see, correct or delete their data')),
   ('contact', 'Contact', '<p>Questions about this policy: call ' + MAILTEL + '.</p>')]),
 'terms.html': ('Terms &amp; Conditions', 'The terms for using homoeocentre.com and ordering from Homoeo Centre.', [
   ('use', 'Using this site', C('who may use the site and acceptable use')),
   ('orders', 'Orders', '<p>Orders are confirmed by phone before dispatch. We may contact you if an item or combination is not available.</p>' + C('when an order is accepted, and when the store may cancel it')),
   ('prices', 'Prices', '<p>Prices are shown in Indian rupees (&#8377;). The price of a configured order depends on the potency, manufacturer, medium, bottle size and number of doses you choose.</p>' + C('whether prices include GST, and how price changes are handled')),
   ('rx', 'Prescription orders', '<p>Prescription orders are reviewed by a licensed pharmacist. The final price is confirmed with you before dispatch.</p>' + C('what happens if a prescription cannot be fulfilled')),
   ('advice', 'Medical disclaimer', '<p>Information on this site is for general awareness and is not a substitute for advice from a qualified homeopath.</p>'),
   ('liability', 'Liability', C('limitation of liability wording, reviewed by the client&rsquo;s legal adviser')),
   ('law', 'Governing law', C('jurisdiction, for example the courts of Kolkata, West Bengal')),
   ('changes', 'Changes to these terms', C('how customers are told about changes'))]),
 'shipping.html': ('Shipping Policy', 'Where we deliver, what it costs and when to expect your order.', [
   ('where', 'Where we deliver', '<p>Enter your PIN code on any product page to check whether we deliver to you.</p>' + C('delivery coverage: Kolkata only, West Bengal, or all of India')),
   ('charges', 'Shipping charges', '<p>Shipping is calculated from your PIN code.</p>' + C('shipping rates and any free-shipping threshold')),
   ('dispatch', 'Dispatch', '<p>Every order is confirmed by phone before it is dispatched. Prescription orders are dispatched after the pharmacist has reviewed the prescription.</p>' + C('usual dispatch time after confirmation')),
   ('delivery', 'Delivery time', C('typical delivery times by region; do not publish until confirmed')),
   ('tracking', 'Tracking your order', C('courier name and how tracking details are shared')),
   ('issues', 'Damaged or incorrect items', '<p>If something arrives damaged or different from what you ordered, call ' + MAILTEL + '.</p>' + C('time limit for reporting and what photos are needed'))]),
 'refund.html': ('Refund &amp; Cancellation Policy', 'When you can cancel, return or get a refund.', [
   ('cancel', 'Cancelling an order', C('until when an order can be cancelled (for example, before the confirmation call or before dispatch)')),
   ('returns', 'Returns', C('which items can be returned; medicines are often non-returnable once opened')),
   ('damaged', 'Damaged or incorrect items', '<p>Tell us as soon as you receive the order: call ' + MAILTEL + '.</p>' + C('replacement or refund rules for damaged and wrong items')),
   ('refunds', 'How refunds are paid', C('refund method and how many working days it takes, once a payment gateway is chosen')),
   ('rx', 'Prescription orders', C('refund rules when a prescription order cannot be fulfilled'))]),
}
TPL = open('src/_policy.tpl', encoding='utf-8').read()
for fn, (title, lead, secs) in POL.items():
    toc = '\n'.join('        <a href="#%s">%s</a>' % (i, h) for i, h, _ in secs)
    body = '\n'.join('          <h2 id="%s">%s</h2>\n          %s' % (i, h, b) for i, h, b in secs)
    meta = json.dumps({"title": title.replace('&amp;', '&') + " — Homoeo Centre", "desc": lead, "nav": ""})
    out = TPL.replace('@META@', meta).replace('@TITLE@', title).replace('@LEAD@', lead).replace('@TOC@', toc).replace('@BODY@', body)
    open('src/' + fn, 'w', encoding='utf-8').write(out)
print('ok')
