import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";
import { brand } from "@/config/brand";

export function EmailLayout({
  previewText,
  children,
}: {
  previewText: string;
  children: React.ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: "#faf8f4", fontFamily: "Helvetica, Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", margin: "0 auto", padding: "32px", maxWidth: "480px" }}>
          <Heading as="h1" style={{ fontSize: "20px", color: "#1c1c1a" }}>
            {brand.name}
          </Heading>
          <Section>{children}</Section>
          <Hr style={{ borderColor: "#e8e4dc", margin: "24px 0" }} />
          <Text style={{ fontSize: "12px", color: "#8a8880" }}>
            {brand.name} is a property marketing and buyer-lead platform serving {brand.launchRegion.label}. We
            are not a real estate broker, attorney, lender, inspector, appraiser, or closing service.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
