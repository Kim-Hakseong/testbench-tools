import ads from "@/content/ads.json";

/**
 * Single ad slot component. Placement is fixed by the page:
 * ① below the results area, ② mid-way through the explainer content —
 * never inside the tool input/result region, max 2 per page.
 *
 * Provider is switched via content/ads.json:
 *  - "none"        → renders NOTHING (no empty frame, no DOM node)
 *  - "ethicalads"  → EthicalAds placement div (script loaded in RootShell);
 *                    no tracking, so no cookie banner is required
 *  - "adsense"     → responsive AdSense unit (requires Google CMP — enable
 *                    only after the CMP is configured; script in RootShell)
 */
export function AdSlot({ id }: { id: string }) {
  if (ads.provider === "ethicalads" && ads.ethicalads.publisher) {
    return (
      <div className="my-8 flex justify-center">
        <div
          id={`ad-${id}`}
          data-ea-publisher={ads.ethicalads.publisher}
          data-ea-type="text"
          data-ea-style="stickybox-alternate"
        />
      </div>
    );
  }
  if (ads.provider === "adsense" && ads.adsense.client) {
    return (
      <div className="my-8 flex justify-center">
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%" }}
          data-ad-client={ads.adsense.client}
          data-ad-slot={id}
          data-ad-format="auto"
        />
      </div>
    );
  }
  return null;
}

/** True when an ad provider is active — RootShell uses this to load the script. */
export const adsEnabled =
  (ads.provider === "ethicalads" && ads.ethicalads.publisher !== "") ||
  (ads.provider === "adsense" && ads.adsense.client !== "");

export const adProvider = ads.provider;
export const adConfig = ads;
