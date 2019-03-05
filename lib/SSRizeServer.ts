import * as express from "express";
import * as uuid from "uuid";
import * as path from "path";
import * as puppeteer from "puppeteer";

export interface SSRizeOptions {
  port: string;
  path: string;
}

const defaultOptions = {
  port: 3000,
  path: "."
};

export default class SSRizeServer {
  private app: express.Application;
  private readonly ssrUserAgent: string;
  private options: SSRizeOptions;

  constructor(options: SSRizeOptions) {
    this.options = {
      ...defaultOptions,
      ...options
    };
    this.ssrUserAgent = `SSRIZE_${uuid.v4()}`;
    this.app = express();
    this.config();
  }

  config() {
    const handler = async (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (req.headers["user-agent"] === this.ssrUserAgent) {
        res.sendFile(path.join(process.cwd(), this.options.path, "index.html"));
        return;
      }

      try {
        const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox"]
        });
        const page = await browser.newPage();

        await page.setRequestInterception(true);

        page.on("request", (puppeteerReq: puppeteer.Request) => {
          const blacklist = [
            "www.google-analytics.com",
            "/gtag/js",
            "ga.js",
            "analytics.js"
          ];
          const whitelist = ["document", "script", "xhr", "fetch"];
          if (!whitelist.includes(puppeteerReq.resourceType())) {
            return puppeteerReq.abort();
          } else if (
            blacklist.find(regex => puppeteerReq.url().match(regex) !== null) // TODO check regex matching
          ) {
            return puppeteerReq.abort();
          }
          return puppeteerReq.continue();
        });

        await page.setUserAgent(this.ssrUserAgent);

        const local_url =
          `http://127.0.0.1:${this.options.port}` + req.originalUrl;
        await page.goto(local_url, {
          waitUntil: "networkidle0"
        });

        const html = await page.content();

        res.send(html);
      } catch (e) {
        console.log(e);
        next("unable to serve request");
      }
    };

    this.app.get("/", handler);
    this.app.use(express.static(this.options.path)); // get from parameter
    this.app.get("*", handler);
  }

  start() {
    this.app.listen(this.options.port, () => {
      console.log("SSRize server listening on port " + this.options.port);
    });
  }
}
