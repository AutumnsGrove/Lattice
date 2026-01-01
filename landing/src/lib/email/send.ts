import { Resend } from 'resend';
import { getWelcomeEmailHtml, getWelcomeEmailText } from './templates';
import { generateUnsubscribeUrl } from './tokens';

export async function sendWelcomeEmail(
	toEmail: string,
	apiKey: string
): Promise<{ success: boolean; error?: string }> {
	const resend = new Resend(apiKey);

	try {
		// Generate unsubscribe URL for this recipient
		const unsubscribeUrl = await generateUnsubscribeUrl(toEmail, apiKey);

		const { error } = await resend.emails.send({
			from: 'Grove <hello@grove.place>',
			to: toEmail,
			subject: 'Welcome to Grove 🌿',
			html: getWelcomeEmailHtml(unsubscribeUrl),
			text: getWelcomeEmailText(unsubscribeUrl),
			headers: {
				'List-Unsubscribe': `<${unsubscribeUrl}>`,
				'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
			}
		});

		if (error) {
			console.error('Resend error:', error);
			return { success: false, error: error.message };
		}

		return { success: true };
	} catch (err) {
		console.error('Email send error:', err);
		return { success: false, error: 'Failed to send email' };
	}
}
