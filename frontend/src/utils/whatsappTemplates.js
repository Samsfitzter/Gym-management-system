/**
 * Calculate the difference in days between today and the expiry date.
 * Past dates will return a negative number.
 */
export const getRemainingDays = (expiryDate) => {
  if (!expiryDate) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Unicode-safe emoji constants to prevent encoding issues
const EMOJI_PIN = String.fromCodePoint(0x1F4CD);   // 📍
const EMOJI_PHONE = String.fromCodePoint(0x1F4DE); // 📞
const EMOJI_EMAIL = String.fromCodePoint(0x1F4E7); // 📧
const EMOJI_CAMERA = String.fromCodePoint(0x1F4F8);// 📸
const EMOJI_PARTY = String.fromCodePoint(0x1F389); // 🎉

/**
 * Generate membership reminder text based on remaining days.
 */
export const generateMembershipReminder = (member, daysRemaining) => {
  const name = member?.name || 'Member';

  if (daysRemaining < 0) {
    // Membership Expired
    return `Hello ${name},

Your membership at Sam's Fitzter has expired.

We would love to have you continue your fitness journey with us. Please visit the gym or contact us to renew your membership.

${EMOJI_PIN} Vanji Nagar
${EMOJI_PHONE} +91 93637 78729
${EMOJI_EMAIL} samsfitzter8729@gmail.com
${EMOJI_CAMERA} Instagram: @samsfitzter

Thank you,
Sam's Fitzter`;
  } else {
    // Membership Expiring (includes expires today, remainingDays >= 0)
    return `Hello ${name},

Your membership at Sam's Fitzter will expire in ${daysRemaining} day(s).

Please renew your membership to continue enjoying uninterrupted access to our facilities and training programs.

For assistance, contact us:

${EMOJI_PIN} Vanji Nagar
${EMOJI_PHONE} +91 93637 78729
${EMOJI_EMAIL} samsfitzter8729@gmail.com
${EMOJI_CAMERA} Instagram: @samsfitzter

Thank you,
Sam's Fitzter`;
  }
};

/**
 * Generate payment due reminder text.
 */
export const generatePaymentReminder = (member) => {
  const name = member?.name || 'Member';
  return `Hello ${name},

We hope you're having a great day! This is a gentle reminder that a balance of ₹${member?.outstanding_balance || member?.due_amount || 0} is currently due on your membership account.

We would appreciate it if you could clear the dues at your earliest convenience. Thank you for being a valued member!

Need help? Contact us:

${EMOJI_PIN} Vanji Nagar
${EMOJI_PHONE} +91 93637 78729
${EMOJI_EMAIL} samsfitzter8729@gmail.com

Thank you,
Sam's Fitzter`;
};

/**
 * Generate birthday wish text.
 */
export const generateBirthdayWish = (member) => {
  const name = member?.name || 'Member';
  return `Happy Birthday ${name}! ${EMOJI_PARTY}

Wishing you a fantastic year filled with good health, happiness, strength, and fitness success.

Thank you for being a valued member of Sam's Fitzter.

We look forward to helping you achieve even greater fitness goals this year.

Best Wishes,
Sam's Fitzter

${EMOJI_PIN} Vanji Nagar
${EMOJI_PHONE} +91 93637 78729
${EMOJI_CAMERA} Instagram: @samsfitzter`;
};

export const generateRenewalMessage = (member, planName, amount, startDate, expiryDate) => {
  const name = member?.name || 'Member';
  return `Hello ${name},\n\nYour membership has been successfully renewed.\n\n📋 Plan: ${planName}\n💰 Amount Paid: ₹${amount}\n📅 Start Date: ${startDate}\n📅 Expiry Date: ${expiryDate}\n\nThank you for choosing Sam's Fitzter 💪\n\nWe look forward to supporting your fitness journey.`;
};

/**
 * Generate a warm "long time no see" message for members absent 7+ days.
 */
export const generateAbsenceMessage = (member, daysSinceLastVisit) => {
  const name = member?.name || 'Member';
  const daysText = daysSinceLastVisit && daysSinceLastVisit > 0
    ? `It's been ${daysSinceLastVisit} days since we last saw you`
    : "It's been a while since we last saw you";

  return `Hey ${name}! 👋

${daysText} at Sam's Fitzter and we genuinely miss you!

Your fitness journey matters to us, and every day you step into the gym brings you closer to your goals. 💪

Come back in and let's get back on track together. We're here to support you every step of the way.

🏋️ See you in the gym soon!

${EMOJI_PIN} Vanji Nagar
${EMOJI_PHONE} +91 93637 78729
${EMOJI_CAMERA} Instagram: @samsfitzter

Warm regards,
Sam's Fitzter`;
};

/**
 * Generate a welcome message for newly registered members.
 */
export const generateWelcomeMessage = (member) => {
  const name = member?.name || 'Member';
  const memberId = member?.register_number || member?.id || '';

  return `Hi ${name} 👋

Welcome to *Sam's Fitzter Lifestyle & Fitness Studio!* 🎉

We're excited to have you join our fitness family! 💪

🆔 Registration No: ${memberId}

No matter your goal—whether it's weight loss, muscle gain, or building strength—we're here to support you every step of the way.

📌 Gym Guidelines
• Be regular and stay consistent
• Follow your diet plan
• Respect your trainer's instructions
• Re-rack weights after use

📲 Important

This is our official gym WhatsApp number.

You'll be added to our Fitzter Family WhatsApp Group for updates, announcements, support, and motivation. 🔥

📞 For any questions, feel free to contact us anytime.

💯 Consistency + Discipline = Results

Your fitness journey starts today. 🚀

— Team Sam's Fitzter`;
};
