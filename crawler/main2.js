const express = require("express");
const fs = require("fs");
const puppeteer = require("puppeteer-extra");
const UserAgent = require("user-agents");

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

const https = require("follow-redirects").https;
const fs = require("fs");
const AdmZip = require("adm-zip");

const apiKey = "36b7dcdcb9a3160a28acf0bf52699d0c";
const pluginURL = "https://antcpt.com/anticaptcha-plugin.zip";

const APIKEY = "b3fc86a7194ba8fcc96739b13bbe1730";

let authorization = "",
  waiting = false;

const WT = 300000;

const start = async () => {
  // download the plugin
  await new Promise((resolve) => {
    https.get(pluginURL, (resp) =>
      resp.pipe(fs.createWriteStream("./plugin.zip").on("close", resolve))
    );
  });
  // unzip it
  const zip = new AdmZip("./plugin.zip");
  await zip.extractAllTo("./plugin/", true);

  // set API key in configuration file
  await new Promise((resolve, reject) => {
    if (fs.existsSync("./plugin/js/config_ac_api_key.js")) {
      let confData = fs.readFileSync(
        "./plugin/js/config_ac_api_key.js",
        "utf8"
      );
      confData = confData.replace(
        /antiCapthaPredefinedApiKey = ''/g,
        `antiCapthaPredefinedApiKey = '${apiKey}'`
      );
      fs.writeFileSync("./plugin/js/config_ac_api_key.js", confData, "utf8");
      resolve();
    } else {
      console.error("plugin configuration not found!");
      reject();
    }
  });
  // Launch the browser
  const browser = await puppeteer.launch({
    // headless: false,
    ignoreDefaultArgs: ["--disable-extensions", "--enable-automation"],
    args: [
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--allow-running-insecure-content",
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--mute-audio",
      "--no-zygote",
      "--no-xshm",
      "--window-size=1920,1080",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--enable-webgl",
      "--ignore-certificate-errors",
      "--lang=en-US,en;q=0.9",
      "--password-store=basic",
      "--disable-gpu-sandbox",
      "--disable-software-rasterizer",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-infobars",
      "--disable-breakpad",
      "--disable-canvas-aa",
      "--disable-2d-canvas-clip-aa",
      "--disable-gl-drawing-for-tests",
      "--enable-low-end-device-mode",
      "--disable-extensions-except=./plugin",
      "--load-extension=./plugin",
    ],
  });

  // const browserURL = 'http://127.0.0.1:21222';
  // const browser = await puppeteer.connect({browserURL});

  // Open a new page
  const page = await browser.newPage();

  const preloadFile = fs.readFileSync("./inject.js", "utf8");
  await page.evaluateOnNewDocument(preloadFile);

  page.on("console", async (msg) => {
    const txt = msg.text();
    if (txt.includes("intercepted-params:")) {
      const params = JSON.parse(txt.replace("intercepted-params:", ""));
      console.log(params);

      try {
        console.log(`Solving the captcha...`);
        const res = await solver.cloudflareTurnstile(params);
        console.log(`Solved the captcha ${res.id}`);
        console.log(res);

        await page.evaluate((token) => {
          cfCallback(token);
        }, res.data);

        console.log("loaded captacha");
        let delay = 10000; // 100 miliseconds

        setTimeout(async () => {
          // Code to execute after the delay
          console.log("100 seconds have passed");
        }, delay);
      } catch (e) {
        console.log(e.err);
      }
    } else {
    }
  });

  // const userAgent = new UserAgent({ deviceCategory: "desktop" });
  // const randomUserAgent = userAgent.toString();

  // await page.setUserAgent(randomUserAgent);

  //#region Login
  await page.goto("https://bigspy.com/user/login", {
    timeout: WT,
  });
  // disable navigation timeout errors
  await page.setDefaultNavigationTimeout(0);

  await page.waitForSelector("#loginform-username", {
    timeout: WT,
  });

  await page.type("#loginform-username", USERNAME);
  await page.type("#loginform-password", PASSWORD);

  // wait for "solved" selector to come up
  await page
    .waitForSelector(".antigate_solver.solved")
    .catch((error) => console.log("failed to wait for the selector"));

  // press submit button
  await Promise.all([
    page.click("#loginBut"),
    page.waitForNavigation({ waitUntil: "networkidle0" }),
  ]);
  //#endregion

  console.log(";)");

  await page.waitForSelector("#iframe-transfer", {
    timeout: WT,
  });

  console.log(";)");

  authorization = await page.evaluate(() => {
    return document
      .querySelector("#iframe-transfer")
      .getAttribute("data-token");
  });

  console.log(authorization);

  //Server
  const app = express();

  app.get("/", (req, res) => {
    res.send("Hello, World!");
  });

  app.get("/api/get", async (req, res) => {
    const { n, begin, end, platform } = req.query;
    if (
      authorization == "" ||
      authorization == undefined ||
      authorization == null
    ) {
      return res.status(401).send({});
    }
    console.log(begin, end, n);
    const data = {
      authorization,
      platform,
      begin,
      end,
      n,
    };

    try {
      await page.waitForSelector("#zbaseiframe", { timeout: WT });
      let elementHandle = await page.$("#zbaseiframe"); // Replace '#iframeId' with your iframe selector
      let frame = await elementHandle.contentFrame();

      const response = await frame.evaluate((data) => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open(
            "GET",
            `https://bigspy.com/ecom/get-ecom-ads?favorite_app_flag=0&ecom_category=&search_type=1&platform=${data.platform}&category=&tag_ids=&ad_positions=&ads_ai_category=&video_duration_type=&os=0&ads_promote_type=0&geo=&exclude_geo=&audience_sex=&audience_age=&game_play=&game_style=&type=2&page=${data.n}&industry=3&language=&keyword=&sort_field=first_seen&region=&seen_begin=${data.begin}&seen_end=${data.end}&original_flag=0&is_preorder=&resume_or_new_ads=&is_real_person=0&theme=&text_md5=&ads_size=&size=60&ads_format=&exclude_keyword=&cod_flag=0&is_theater=0&is_ai_app=0&landing_page=0&cta_type=0&new_ads_flag=1&like_begin=&like_end=&comment_begin=&comment_end=&share_begin=&share_end=&position=0&is_hide_advertiser=0&advertiser_key=&dynamic=0&shopping=0&duplicate=0&software_types=&ecom_types=&social_account=&modules=ecomad&page_id=&landing_type=0&is_first=0&page_load_more=1&source_app=&redirect_filter_type=`
          );
          xhr.setRequestHeader("authorization", data.authorization);
          xhr.setRequestHeader("Referer", "Referer");
          xhr.setRequestHeader("Sec-Fetch-Dest", "empty");
          xhr.setRequestHeader("Sec-Fetch-Mode", "cors");
          xhr.setRequestHeader("Sec-Fetch-Site", "same-origin");
          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(xhr.statusText);
            }
          };
          xhr.onerror = () => reject(xhr.statusText);
          xhr.send();
        });
      }, data);
      res.send(response);
    } catch (err) {
      console.log(err);
      res.status(500).send({});
    }
  });

  app.get("/api/information", async (req, res) => {
    const { id, first_seen } = req.query;
    if (
      authorization == "" ||
      authorization == undefined ||
      authorization == null
    ) {
      return res.status(401).send({});
    }
    const data = {
      authorization,
      id,
      first_seen,
    };
    try {
      elementHandle = await page.$("#zbaseiframe"); // Replace '#iframeId' with your iframe selector
      frame = await elementHandle.contentFrame();

      const response = await frame.evaluate((data) => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open(
            "GET",
            `https://bigspy.com/ecom/get-ecom-dialog-info?ad_key=${data.id}&app_type=3&created_at=${data.first_seen}`
          );
          xhr.setRequestHeader("Referer", "Referer");
          xhr.setRequestHeader("Sec-Fetch-Dest", "empty");
          xhr.setRequestHeader("Sec-Fetch-Mode", "cors");
          xhr.setRequestHeader("Sec-Fetch-Site", "same-origin");
          xhr.setRequestHeader("authorization", data.authorization);
          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(";(");
            }
          };
          xhr.onerror = () => reject(";(");
          xhr.send();
        });
      }, data);
      console.log(response);
      if (response.is_ban) return res.send({ banned: true });
      res.send({ data: response.data });
    } catch (err) {
      console.log(err);
      res.status(500).send({});
    }
  });

  app.get("/api/sneeze", async (req, res) => {
    waiting = true;
    elementHandle = await page.$("#zbaseiframe"); // Replace '#iframeId' with your iframe selector
    frame = await elementHandle.contentFrame();
    const disabled = await frame.evaluate(() => {
      return (
        document
          .querySelector(".el-pagination button.btn-prev")
          .getAttribute("disabled") == "disabled"
      );
    });
    if (disabled) await frame.click(".el-pagination button.btn-next");
    else await frame.click(".el-pagination button.btn-prev");
    res.send(200);
    waiting = false;
  });

  app.get("/api/ping", async (req, res) => {
    res.send({
      waiting,
    });
  });

  const port = 5001;

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};

try {
  start();
} catch (err) {
  start();
}
