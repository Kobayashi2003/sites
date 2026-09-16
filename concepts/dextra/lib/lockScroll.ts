/** Keep the document width stable while a dialog or focus view locks scrolling. */
export function lockScroll() {
  const body = document.body;
  const overflow = body.style.overflow;
  const padding = body.style.paddingRight;
  const gutter = window.innerWidth - document.documentElement.clientWidth;
  body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + gutter}px`;
  body.style.overflow = 'hidden';
  return () => {
    body.style.overflow = overflow;
    body.style.paddingRight = padding;
  };
}
