import type { Preview } from "@storybook/react";
import "../src/styles/globals.css";

const preview: Preview = {
  parameters: {
    controls: { expanded: true, matchers: { color: /(background|color)$/i, date: /Date$/i } },
    backgrounds: {
      default: "surface",
      values: [
        { name: "surface",       value: "#FFFFFF" },
        { name: "surface-muted", value: "#F9F9F9" },
        { name: "surface-warm",  value: "#FFF5F5" },
        { name: "surface-brand", value: "#0168B3" },
      ],
    },
    viewport: {
      viewports: {
        mobile:  { name: "Mobile (375)",  styles: { width: "375px",  height: "812px" } },
        tablet:  { name: "Tablet (768)",  styles: { width: "768px",  height: "1024px" } },
        laptop:  { name: "Laptop (1280)", styles: { width: "1280px", height: "800px"  } },
        desktop: { name: "Desktop (1440)",styles: { width: "1440px", height: "900px"  } },
      },
    },
  },
};

export default preview;
