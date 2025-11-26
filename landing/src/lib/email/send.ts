import { Resend } from 'resend';
import { getWelcomeEmailHtml, getWelcomeEmailText } from './templates';

export async function sendWelcomeEmail(
	toEmail: string,
	apiKey: string
): Promise<{ success: boolean; error?: string }> {
	const resend = new Resend(apiKey);

	try {
		const { error } = await resend.emails.send({
			from: 'Grove <hello@grove.place>',
			to: toEmail,
			subject: 'Welcome to Grove 🌿',
			html: getWelcomeEmailHtml(),
			text: getWelcomeEmailText()
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
