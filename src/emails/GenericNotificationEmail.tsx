import { Button, Text } from "@react-email/components";
import { EmailLayout } from "./components/EmailLayout";

export type GenericNotificationEmailProps = {
  previewText: string;
  heading: string;
  intro: string;
  bullets?: { label: string; value: string }[];
  ctaLabel?: string;
  ctaUrl?: string;
  footnote?: string;
};

export default function GenericNotificationEmail({
  previewText,
  heading,
  intro,
  bullets,
  ctaLabel,
  ctaUrl,
  footnote,
}: GenericNotificationEmailProps) {
  return (
    <EmailLayout previewText={previewText}>
      <Text style={{ fontSize: "16px", fontWeight: 600, color: "#1c1c1a" }}>{heading}</Text>
      <Text style={{ fontSize: "14px", color: "#1c1c1a" }}>{intro}</Text>
      {bullets?.map((b) => (
        <Text key={b.label} style={{ fontSize: "14px", color: "#1c1c1a", margin: "4px 0" }}>
          <strong>{b.label}:</strong> {b.value}
        </Text>
      ))}
      {ctaLabel && ctaUrl && (
        <Button
          href={ctaUrl}
          style={{
            backgroundColor: "#1f4d3a",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "8px",
            fontSize: "14px",
            marginTop: "16px",
            display: "inline-block",
          }}
        >
          {ctaLabel}
        </Button>
      )}
      {footnote && (
        <Text style={{ fontSize: "12px", color: "#8a8880", marginTop: "16px" }}>{footnote}</Text>
      )}
    </EmailLayout>
  );
}
