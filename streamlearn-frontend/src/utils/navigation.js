/**
 * Where "Play" should lead for a title. Series and courses have no single video, so they open
 * the detail page (episodes / curriculum, with Resume). Everything else goes straight to the
 * player. Always use the slug; the API accepts ids too, but slugs make readable links.
 */
export const playPath = (content) =>
  content.type === 'series' || content.type === 'course'
    ? `/watch/${content.slug}`
    : `/player/${content.slug}`;
