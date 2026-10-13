/* JavaScriptが使えない場合も、HTMLのナビゲーションは表示されたままになる。 */
(() => {
  "use strict";
  const toggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector("#site-navigation");
  if (!toggle || !navigation) return;

  const mobile = window.matchMedia("(max-width: 768px)");

  function setExpanded(expanded) {
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.setAttribute("aria-label", expanded ? "メニューを閉じる" : "メニューを開く");
    navigation.hidden = mobile.matches && !expanded;
  }

  function syncViewport() {
    // リサイズでフォーカス中のリンクやボタンを非表示にする場合は移動先を確保する。
    const focusInNavigation = navigation.contains(document.activeElement);
    const focusOnToggle = document.activeElement === toggle;
    toggle.hidden = !mobile.matches;
    setExpanded(false);
    if (mobile.matches && focusInNavigation) toggle.focus();
    if (!mobile.matches && focusOnToggle) navigation.querySelector("a")?.focus();
  }

  toggle.addEventListener("click", () => {
    setExpanded(toggle.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mobile.matches && toggle.getAttribute("aria-expanded") === "true") {
      setExpanded(false);
      toggle.focus();
    }
  });

  navigation.addEventListener("click", (event) => {
    if (mobile.matches && event.target.closest("a")) {
      setExpanded(false);
      toggle.focus();
    }
  });

  mobile.addEventListener("change", syncViewport);
  syncViewport();
})();
