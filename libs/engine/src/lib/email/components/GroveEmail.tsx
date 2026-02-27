/**
 * GroveEmail - Base email wrapper with Grove styling
 *
 * Provides the consistent Grove look: warm cream background,
 * centered container, header with logo, content area, and footer.
 */
import {
	Html,
	Head,
	Body,
	Container,
	Section,
	Img,
	Text,
	Link,
	Preview,
	Font,
} from "@react-email/components";
import * as React from "react";
import { GROVE_EMAIL_COLORS } from "./styles";

export interface GroveEmailProps {
	children: React.ReactNode;
	previewText?: string;
	/** Hide the Grove logo header */
	hideHeader?: boolean;
	/** Hide the footer with signature and unsubscribe */
	hideFooter?: boolean;
	/** Custom footer signature (defaults to "— Autumn") */
	signature?: string;
}

export function GroveEmail({
	children,
	previewText,
	hideHeader = false,
	hideFooter = false,
	signature = "— Autumn",
}: GroveEmailProps) {
	return (
		<Html lang="en">
			<Head>
				<Font
					fontFamily="Lexend"
					fallbackFontFamily={["Arial", "Helvetica", "sans-serif"]}
					webFont={{
						url: "https://fonts.gstatic.com/s/lexend/v26/wlpwgwvFAVdoq2_v-6QU.woff2",
						format: "woff2",
					}}
					fontWeight={300}
					fontStyle="normal"
				/>
				<Font
					fontFamily="Lexend"
					fallbackFontFamily={["Arial", "Helvetica", "sans-serif"]}
					webFont={{
						url: "https://fonts.gstatic.com/s/lexend/v26/wlpwgwvFAVdoq2_v-6QU.woff2",
						format: "woff2",
					}}
					fontWeight={400}
					fontStyle="normal"
				/>
			</Head>
			{previewText && <Preview>{previewText}</Preview>}
			<Body style={styles.body}>
				<Container style={styles.container}>
					{/* Header with logo */}
					{!hideHeader && (
						<Section style={styles.header}>
							<Link href="https://grove.place" style={styles.logoLink}>
								<Img
									src="https://cdn.grove.place/email/logo.png"
									width={56}
									height={56}
									alt="Grove"
									style={styles.logo}
								/>
							</Link>
						</Section>
					)}

					{/* Content */}
					<Section style={styles.content}>{children}</Section>

					{/* Footer */}
					{!hideFooter && (
						<Section style={styles.footer}>
							<Text style={styles.signature}>{signature}</Text>
							<Text style={styles.tagline}>
								<em>A place to be.</em>
							</Text>
							<Text style={styles.links}>
								<Link href="https://grove.place" style={styles.link}>
									grove.place
								</Link>
								{" · "}
								<Link href="https://grove.place/unsubscribe" style={styles.link}>
									step away (unsubscribe)
								</Link>
							</Text>
						</Section>
					)}
				</Container>
			</Body>
		</Html>
	);
}

const styles = {
	body: {
		margin: 0,
		padding: 0,
		backgroundColor: GROVE_EMAIL_COLORS.warmCream,
		fontFamily: "Lexend, Arial, Helvetica, sans-serif",
	},
	container: {
		maxWidth: "600px",
		margin: "0 auto",
		padding: "40px 20px",
	},
	header: {
		textAlign: "center" as const,
		paddingBottom: "30px",
	},
	logoLink: {
		display: "inline-block",
	},
	logo: {
		display: "inline-block",
		borderRadius: "50%",
	},
	content: {
		padding: "30px",
		backgroundColor: GROVE_EMAIL_COLORS.softGreen,
		borderRadius: "12px",
	},
	footer: {
		textAlign: "center" as const,
		paddingTop: "40px",
	},
	signature: {
		margin: "0 0 8px 0",
		fontSize: "14px",
		color: GROVE_EMAIL_COLORS.barkBrown,
		opacity: 0.6,
	},
	tagline: {
		margin: "0 0 16px 0",
		fontSize: "12px",
		color: GROVE_EMAIL_COLORS.barkBrown,
		opacity: 0.5,
	},
	links: {
		margin: 0,
		fontSize: "11px",
		color: GROVE_EMAIL_COLORS.barkBrown,
		opacity: 0.4,
	},
	link: {
		color: "inherit",
		textDecoration: "none",
	},
};
