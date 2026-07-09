import { chromium } from "npm:playwright";
import type { IPublisher } from "../ports/publisher.ts";
import type { MovieReview } from "../types.ts";

// ponytail: selectors target Letterboxd's current DOM — update here if the site changes
const SELECTORS = {
  searchInput: 'input[name="q"]',
  firstFilmResult: ".film-list .film-detail a, .search-result a[href*='/film/']",
  logButton: 'a[href*="/diary/"]',
  reviewTextarea: 'textarea[name="review"]',
  ratingInput: (stars: number) => `.rating-input input[value="${stars * 2}"]`, // Letterboxd uses half-stars (1-10 internally)
  likeButton: 'button.like-link',
  saveButton: 'input[type="submit"][value="Save"], button[type="submit"]',
};

export class LetterboxdPublisher implements IPublisher {
  constructor(
    private readonly username: string,
    private readonly password: string,
    private readonly headless: boolean = true,
  ) {}

  async publish(review: MovieReview): Promise<void> {
    const browser = await chromium.launch({ headless: this.headless });
    const page = await browser.newPage();

    try {
      await this.login(page);
      await this.logReview(page, review);
      console.log(`✓ Review for "${review.title}" posted to Letterboxd`);
    } finally {
      await browser.close();
    }
  }

  private async login(page: import("npm:playwright").Page): Promise<void> {
    await page.goto("https://letterboxd.com/sign-in/");
    await page.fill('input[name="username"]', this.username);
    await page.fill('input[name="password"]', this.password);
    await page.click('input[type="submit"][value="Sign in"], button[type="submit"]');
    await page.waitForURL("https://letterboxd.com/", { timeout: 10_000 });
  }

  private async logReview(page: import("npm:playwright").Page, review: MovieReview): Promise<void> {
    // Search for the film
    await page.goto(`https://letterboxd.com/search/films/${encodeURIComponent(review.title)}/`);
    await page.waitForSelector(SELECTORS.firstFilmResult, { timeout: 8_000 });
    const filmLink = page.locator(SELECTORS.firstFilmResult).first();
    const filmHref = await filmLink.getAttribute("href");

    if (!filmHref) throw new Error(`Film not found on Letterboxd: ${review.title}`);

    // Open the film's log entry page
    const filmSlug = filmHref.replace(/^\/film\//, "").replace(/\/$/, "");
    await page.goto(`https://letterboxd.com/film/${filmSlug}/review/by/${this.username}/`);

    // Fall back to diary add if no existing review page
    await page.goto(`https://letterboxd.com/diary/add/?filmSlug=${filmSlug}`);
    await page.waitForSelector(SELECTORS.reviewTextarea, { timeout: 8_000 });

    // Fill review
    await page.fill(SELECTORS.reviewTextarea, review.review);

    // Set star rating
    await page.click(SELECTORS.ratingInput(review.stars));

    // Toggle liked heart if liked
    if (review.liked) {
      await page.click(SELECTORS.likeButton);
    }

    await page.click(SELECTORS.saveButton);
    await page.waitForLoadState("networkidle");
  }
}
