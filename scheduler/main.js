const { exec } = require("child_process");
const cron = require("node-cron");
var sha256 = require("js-sha256").sha256;
const axios = require("axios");
const fs = require("fs");
const AWS = require("aws-sdk");
const https = require("https");
require("dotenv").config();

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.S3_REGION;
const Bucket = process.env.S3_BUCKET;
AWS.config.update({
  region: region,
  accessKeyId: accessKeyId,
  secretAccessKey: secretAccessKey,
});
// Create an S3 object
const s3 = new AWS.S3();

function aws_upload(url, fileName) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (response) => {
      console.log(`Status Code: ${response.statusCode}`);
      // Handle the response
      fs.writeFileSync("temp.bin", "");
      response.on("data", (chunk) => {
        fs.appendFileSync("temp.bin", chunk);
      });
      response.on("end", () => {
        // Continue with uploading the file to S3
        // ...
        console.log(";) download");
        const params = {
          ACL: "public-read",
          Bucket,
          Key: `${fileName}`,
          Body: fs.readFileSync("temp.bin"),
        };
        try {
          // Upload the file to S3
          const uploadPromise = s3.putObject(params).promise();

          uploadPromise
            .then((data) => {
              console.log(
                `Successfully uploaded file to ${params.Bucket}.s3.${region}.amazonaws.com/${params.Key}`
              );
              resolve(
                `https://${params.Bucket}.s3.${region}.amazonaws.com/${params.Key}`
              );
            })
            .catch((err) => {
              console.error(err);
              reject(err);
            });
        } catch (err) {
          reject(err);
        }
      });
      setTimeout(() => {
        reject();
      }, 1000 * 60 * 60);
    });
    req.setTimeout(10 * 60 * 1000, () => {
      console.log(";) timeout");
      reject();
    });
    req.on("error", (e) => {
      console.error(e);
      reject(e);
    });
  });
}

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

mongoose
  .connect("mongodb://144.91.126.113:27017", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: "onlyads",
    user: "devman",
    pass: "mari2Ana23sem",
  })
  .then(() => {
    console.log("Connected to the database!");
  })
  .catch((err) => {
    console.log("Cannot connect to the database!", err);
    process.exit();
  });

var schema = mongoose.Schema(
  {
    id: String,
    domain: String,
    publisher: String,
    source_url: String,
    advertiser_name: String,
    app_developer: String,
    logo_url: String,
    app_type: Number,
    os: Number,
    title: String,
    body: String,
    message: String,
    preview_img_url: String,
    resource_urls: [],
    cdn_url: String,
    call_to_action_type: String,
    store_url: String,
    first_seen: String,
    last_seen: String,
    platform: Number,
    type: Number,
    like_count: String,
    comment_count: String,
    share_count: String,
    view_count: String,
    dislike_count: String,
    pin: Number,
    heat: String,
    impression: String,
    days_count: String,
    page_id: String,
    post_id: String,
    page_name: String,
    categoryTag: [],
    post_url: String,
    feature_ads_flag: Number,
    track_flag: Number,
    textMd5: String,
    dynamic_number: [],
    category: [],
    theme: [],
    game_play: [],
    game_style: [],
    ad_width: Number,
    ad_height: Number,
    ads_format: String,
    relate_ads: Number,
    language: String,
    created_date: String,
    html_url: String,
    countries: [],
    store_url: String,
    multi_advertiser_names: [],
    redirect_urls: [],
  },
  { timestamps: true }
);

const Ads = mongoose.model("ads", schema);

var tempSchema = mongoose.Schema({
  id: String,
  domain: String,
  publisher: String,
  source_url: String,
  logo_url: String,
  resource_urls: [],
  created_at: String,
  store_url: String,
  first_seen: String,
  last_seen: String,
});

const Temp = mongoose.model("stemps", tempSchema);

// const clear = async () => {
//   const duplicateRecords = await Ads.aggregate([
//     { $group: { _id: "$id", count: { $sum: 1 }, ids: { $addToSet: "$_id" } } },
//     { $match: { count: { $gt: 1 } } },
//   ]).exec();
//   const idsToRemove = duplicateRecords.flatMap(({ ids }) => ids.slice(1));
//   console.log(idsToRemove);

//   await Ads.deleteMany({ _id: { $in: idsToRemove } }).exec();
// };
// clear();
// return;

let storedCount = 0;

async function storeSched() {
  const element = await Temp.findOne({}).sort({ _id: -1 });
  try {
    if (element == null) return;
    const response = await axios.get(
      `http://localhost:5001/api/information?id=${element.id}&first_seen=${element.created_at}`
    );
    if (response.status === 200) {
      if (response.data.banned) return;
      response.data.data.id = element.id;
      response.data.data.domain = element.domain;
      response.data.data.publisher = element.platform;

      let l = element.resource_urls[0]?.image_url;
      if (response.data.data.resource_urls)
        l = response.data.data.resource_urls[0]?.image_url;
      let fileName = element.id + l.match(/\.[0-9a-z]+$/i)[0];
      response.data.data.resource_urls[0].s3_image_url = await aws_upload(
        l,
        fileName
      );
      console.log(";) image");
      l = element.resource_urls[0]?.video_url;
      if (response.data.data.resource_urls[0]?.video_url)
        l = response.data.data.resource_urls[0]?.video_url;
      fileName = element.id + l.match(/\.[0-9a-z]+$/i)[0];
      response.data.data.resource_urls[0].s3_video_url = await aws_upload(
        l,
        fileName
      );
      console.log(";) video");
      l = element.logo_url;
      if (response.data.data.logo_url) l = response.data.data.logo_url;
      if (l != "" && l != null && l != undefined) {
        fileName = element.id + "_logo_" + l.match(/\.[0-9a-z]+$/i)[0];
        response.data.data.logo_url = await aws_upload(l, fileName);
      }
      console.log(";) logo");
      await Ads.create(response.data.data);
      console.log(";) mongodb");
    }
    await Temp.deleteOne({ _id: element._id });
    // storedCount++;
    // if (storedCount > 15) {
    //   const v = await axios.get(`http://localhost:5001/api/sneeze`);
    //   if (v.data == 400) return 0;
    //   storedCount = 0;
    // }
  } catch (err) {
    await Temp.deleteOne({ _id: element._id });
    console.log(err);
  }
}

async function getYoutubeAds(page) {
  let keys = [];
  const y = new Date();
  y.setDate(y.getDate() - 1);
  y.setHours(0, 0, 0, 0);
  try {
    keys = await Ads.find({
      createdAt: { $gte: y },
      platform: 7,
    }).distinct("id");
    const keys_ = await Temp.find({}).distinct("id");
    keys = keys.concat(keys_);
  } catch (err) {
    console.log(";(");
  }
  let data_array = [];
  const t = new Date(),
    n = new Date();
  n.setDate(t.getDate() - 1);
  n.setHours(0, 0, 0, 0);
  t.setHours(23, 59, 59, 999);
  const timestamp = t.getTime();
  const start_time = parseInt(n.getTime() / 1e3);
  const end_time = parseInt(timestamp / 1e3);
  try {
    const params = `platform=7&n=${page}&begin=${start_time}&end=${end_time}`;
    const r = await axios.get("http://localhost:5001/api/get?" + params);
    const data = r.data.data;
    if (r.data.errcode == 110008) return page;
    for (i in data) {
      let element = data[i];
      element.id = element.ad_key;
      if (keys.includes(element.ad_key)) {
        console.log(`>>> ${element.ad_key}`);
        continue;
      }
      if (element.resource_urls[0]?.type === 2) {
        data_array.push(element);
      }
    }
  } catch (err) {
    console.log(err);
  }
  try {
    await Temp.insertMany(data_array);
    const v = await axios.get(`http://localhost:5001/api/sneeze`);
    if (v.data == 400) return 0;
  } catch (err) {}
  return page + 1;
}

async function getTiktokAds(page) {
  let keys = [];
  const y = new Date();
  y.setDate(y.getDate() - 1);
  y.setHours(0, 0, 0, 0);
  try {
    keys = await Ads.find({
      createdAt: { $gte: y },
      platform: 43,
    }).distinct("id");
    const keys_ = await Temp.find({}).distinct("id");
    keys = keys.concat(keys_);
  } catch (err) {
    console.log(";(");
  }
  let data_array = [];
  const t = new Date(),
    n = new Date();
  n.setDate(t.getDate() - 1);
  n.setHours(0, 0, 0, 0);
  t.setHours(23, 59, 59, 999);
  const timestamp = t.getTime();
  const start_time = parseInt(n.getTime() / 1e3);
  const end_time = parseInt(timestamp / 1e3);
  try {
    const params = `platform=43&n=${page}&begin=${start_time}&end=${end_time}`;
    const r = await axios.get("http://localhost:5001/api/get?" + params);
    const data = r.data.data;
    if (r.data.errcode == 110008) return page;
    for (i in data) {
      let element = data[i];
      element.id = element.ad_key;
      if (keys.includes(element.ad_key)) {
        console.log(`>>> ${element.ad_key}`);
        continue;
      }
      if (element.resource_urls[0]?.type === 2) {
        data_array.push(element);
      }
    }
  } catch (err) {
    console.log(err);
  }
  try {
    await Temp.insertMany(data_array);
    const v = await axios.get(`http://localhost:5001/api/sneeze`);
    if (v.data == 400) return 0;
  } catch (err) {}
  return page + 1;
}

async function getFacebookAds(page) {
  let keys = [];
  const y = new Date();
  y.setDate(y.getDate() - 1);
  y.setHours(0, 0, 0, 0);
  try {
    keys = await Ads.find({
      createdAt: { $gte: y },
      platform: 1,
    }).distinct("id");
    const keys_ = await Temp.find({}).distinct("id");
    keys = keys.concat(keys_);
  } catch (err) {
    console.log(";(");
  }
  let data_array = [];
  const t = new Date(),
    n = new Date();
  n.setDate(t.getDate() - 1);
  n.setHours(0, 0, 0, 0);
  t.setHours(23, 59, 59, 999);
  const timestamp = t.getTime();
  const start_time = parseInt(n.getTime() / 1e3);
  const end_time = parseInt(timestamp / 1e3);
  try {
    const params = `platform=1&n=${page}&begin=${start_time}&end=${end_time}`;
    const r = await axios.get("http://localhost:5001/api/get?" + params);
    const data = r.data.data;
    if (r.data.errcode == 110008) return page;
    for (i in data) {
      let element = data[i];
      element.id = element.ad_key;
      if (keys.includes(element.ad_key)) {
        console.log(`>>> ${element.ad_key}`);
        continue;
      }
      if (element.resource_urls[0]?.type === 2) {
        data_array.push(element);
      }
    }
  } catch (err) {
    console.log(err);
  }
  try {
    await Temp.insertMany(data_array);
    const v = await axios.get(`http://localhost:5001/api/sneeze`);
    if (v.data == 400) return 0;
  } catch (err) {}
  return page + 1;
}

async function getTwitterAds(page) {
  let keys = [];
  const y = new Date();
  y.setDate(y.getDate() - 1);
  y.setHours(0, 0, 0, 0);
  try {
    keys = await Ads.find({
      createdAt: { $gte: y },
      platform: 2,
    }).distinct("id");
    const keys_ = await Temp.find({}).distinct("id");
    keys = keys.concat(keys_);
  } catch (err) {
    console.log(";(");
  }
  let data_array = [];
  const t = new Date(),
    n = new Date();
  n.setDate(t.getDate() - 1);
  n.setHours(0, 0, 0, 0);
  t.setHours(23, 59, 59, 999);
  const timestamp = t.getTime();
  const start_time = parseInt(n.getTime() / 1e3);
  const end_time = parseInt(timestamp / 1e3);
  try {
    const params = `platform=2&n=${page}&begin=${start_time}&end=${end_time}`;
    const r = await axios.get("http://localhost:5001/api/get?" + params);
    const data = r.data.data;
    if (r.data.errcode == 110008) return page;
    for (i in data) {
      let element = data[i];
      element.id = element.ad_key;
      if (keys.includes(element.ad_key)) {
        console.log(`>>> ${element.ad_key}`);
        continue;
      }
      if (element.resource_urls[0]?.type === 2) {
        data_array.push(element);
      }
    }
  } catch (err) {
    console.log(err);
  }
  try {
    await Temp.insertMany(data_array);
    const v = await axios.get(`http://localhost:5001/api/sneeze`);
    if (v.data == 400) return 0;
  } catch (err) {}
  return page + 1;
}

async function getInstagramAds(page) {
  let keys = [];
  const y = new Date();
  y.setDate(y.getDate() - 1);
  y.setHours(0, 0, 0, 0);
  try {
    keys = await Ads.find({
      createdAt: { $gte: y },
      platform: 5,
    }).distinct("id");
    const keys_ = await Temp.find({}).distinct("id");
    keys = keys.concat(keys_);
  } catch (err) {
    console.log(";(");
  }
  let data_array = [];
  const t = new Date(),
    n = new Date();
  n.setDate(t.getDate() - 1);
  n.setHours(0, 0, 0, 0);
  t.setHours(23, 59, 59, 999);
  const timestamp = t.getTime();
  const start_time = parseInt(n.getTime() / 1e3);
  const end_time = parseInt(timestamp / 1e3);
  try {
    const params = `platform=5&n=${page}&begin=${start_time}&end=${end_time}`;
    const r = await axios.get("http://localhost:5001/api/get?" + params);
    const data = r.data.data;
    if (r.data.errcode == 110008) return page;
    for (i in data) {
      let element = data[i];
      element.id = element.ad_key;
      if (keys.includes(element.ad_key)) {
        console.log(`>>> ${element.ad_key}`);
        continue;
      }
      if (element.resource_urls[0]?.type === 2) {
        data_array.push(element);
      }
    }
  } catch (err) {
    console.log(err);
  }
  try {
    await Temp.insertMany(data_array);
    const v = await axios.get(`http://localhost:5001/api/sneeze`);
    if (v.data == 400) return 0;
  } catch (err) {}
  return page + 1;
}

async function getPinterestAds(page) {
  let keys = [];
  const y = new Date();
  y.setDate(y.getDate() - 1);
  y.setHours(0, 0, 0, 0);
  try {
    keys = await Ads.find({
      createdAt: { $gte: y },
      platform: 4,
    }).distinct("id");
    const keys_ = await Temp.find({}).distinct("id");
    keys = keys.concat(keys_);
  } catch (err) {
    console.log(";(");
  }
  let data_array = [];
  const t = new Date(),
    n = new Date();
  n.setDate(t.getDate() - 1);
  n.setHours(0, 0, 0, 0);
  t.setHours(23, 59, 59, 999);
  const timestamp = t.getTime();
  const start_time = parseInt(n.getTime() / 1e3);
  const end_time = parseInt(timestamp / 1e3);
  try {
    const params = `platform=4&n=${page}&begin=${start_time}&end=${end_time}`;
    const r = await axios.get("http://localhost:5001/api/get?" + params);
    const data = r.data.data;
    if (r.data.errcode == 110008) return page;
    for (i in data) {
      let element = data[i];
      element.id = element.ad_key;
      if (keys.includes(element.ad_key)) {
        console.log(`>>> ${element.ad_key}`);
        continue;
      }
      if (element.resource_urls[0]?.type === 2) {
        data_array.push(element);
      }
    }
  } catch (err) {
    console.log(err);
  }
  try {
    await Temp.insertMany(data_array);
    const v = await axios.get(`http://localhost:5001/api/sneeze`);
    if (v.data == 400) return 0;
  } catch (err) {}
  return page + 1;
}

let pages = [1, 1, 1, 1, 1, 1];

cron.schedule("*/2 * * * *", () => {
  console.log("=>");
  storeSched();
});

const main = async (p) => {
  console.log(`>>> ${p} >>>`);
  let page = pages[p];
  try {
    switch (p) {
      case 0:
        page = await getYoutubeAds(page);
        pages[p] = page % 10;
        break;
      case 1:
        page = await getTiktokAds(page);
        pages[p] = page % 10;
        break;
      case 2:
        page = await getFacebookAds(page);
        pages[p] = page % 10;
        break;
      case 3:
        page = await getInstagramAds(page);
        pages[p] = page % 10;
        break;
      case 4:
        page = await getTwitterAds(page);
        pages[p] = page % 10;
        break;
      case 5:
        page = await getPinterestAds(page);
        pages[p] = page;
        break;
    }
    console.log(`${p} ;)`);
  } catch (err) {
    console.log(err);
  }
  setTimeout(() => main((p + 1) % 3), 1000 * 60 * 60);
};

main(Math.floor(Math.random() * 3));
