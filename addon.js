const { addonBuilder, getRouter } = require("stremio-addon-sdk");
const api = require("./KnabenAPI");
const pdbapi = require("./PDB_Catalog");
const {
  GeneratingRequestDownloadLink,
  torbox_chech_availability,
} = require("./torboxAPI.js");

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

const category = {
  audio: 1000000,
  tv: 2000000,
  movie: 3000000,
  adult: 5001000,
  anime: 6000000,
};

const manifest = {
  id: "community.Knaben",
  name: "Knaben Results with Torbox",
  version: "0.0.1",
  resources: ["catalog", "meta", "stream"],
  types: ["movie", "series", "channel", "tv"],
  catalogs: [
    {
      type: "movie",
      id: "knaben_top",
      name: "knaben_top",
      extra: [
        { name: "search", isRequired: false },
        { name: "skip", isRequired: false },
        {
          name: "genre",
          options: ["movie", "tv", "anime", "audio", "adult"],
          isRequired: false,
        },
      ],
    },
    {
      type: "movie",
      id: "THE_PDB",
      name: "THE_PDB",
      extra: [
        { name: "search", isRequired: false },
        { name: "skip", isRequired: false },
        {
          name: "genre",
          options: ["scenes", "movies", "jav"],
          isRequired: false,
        },
      ],
    },
  ],
  description: "",
  // THIS IS THE IMPORTANT PART:
  behaviorHints: {
    configurable: true,
  },
  // config: [
  //   {
  //     key: "torbox_api",
  //     type: "text",
  //     title: "Torbox API Key",
  //     required: false,
  //   },
  //   { key: "PDB_api", type: "text", title: "PDB API Key", required: false },
  // ],
};

const poster =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/220px-Big_buck_bunny_poster_big.jpg";
const PORT = 7000;

let metadata = [];
let current_meta;

async function push_to_metadata(data) {
  let catalog_data = [];
  if (!data || !Array.isArray(data)) {
    console.error("push_to_metadata received invalid data:", data);
    return catalog_data;
  }
  data.forEach((ele) => {
    catalog_data.push({
      id: "TPDB-K/" + ele.hash,
      name: ele.title + " " + ele.seeders + " " + ele.peers,
      releaseInfo: ele.date ? new Date(ele.date).getFullYear() : null,
      type: "movie",
      poster: poster,
      posterShape: "poster",
      bytes: ele.bytes,
      cachedOrigin: ele.cachedOrigin,
      hash: ele.hash,
      magnetUrl: ele.magnetUrl,
      trackerId: ele.trackerId,
      tracker: ele.tracker,
    });
  });
  metadata = metadata.concat(catalog_data);
  return catalog_data;
}

async function THEPDB_metadata(metas) {
  let catalog_data = [];
  if (!metas || !Array.isArray(metas)) {
    console.error("push_to_metadata received invalid data:", metas);
    return catalog_data;
  }

  metas.forEach((ele) =>
    catalog_data.push({
      id: "TPDB-P/" + ele.id,
      type: "movie",
      name: ele.title,
      genres: ele.tags,
      // poster: ele.poster || ele.image || ele.background || poster,
      poster: poster,
      posterShape: "poster",
      // background: ele.background || ele.image || ele.poster || poster,
      background: poster,
      // logo: ele.poster || ele.image || ele.background || poster,
      logo: poster,
      description: `Channel : ${ele.site} \n${ele.description}`,
      releaseInfo: ele.date ? new Date(ele.date).getFullYear() : null,
      released: ele.date ? new Date(ele.date) : null,
      cast: ele.performers ? ele.performers : null,
      trailerStreams: [{ url: ele.trailer, title: "Trailer" }],
      runtime: ele.duration ? `${(ele.duration / 60).toFixed(0)} mins` : null,
      website: ele.url ? ele.url : null,
      site: ele.site,
      performers: ele.performers,
      external_id: ele.external_id,
    }),
  );
  metadata = metadata.concat(catalog_data);
  return catalog_data;
}

// function parseSceneToTorrentString(scene) {
//   if (!scene) return "";

//   // Format date → YY MM DD
//   const date = new Date(scene.date);
//   const yy = String(date.getFullYear()).slice(-2);
//   const mm = String(date.getMonth() + 1).padStart(2, "0");
//   const dd = String(date.getDate()).padStart(2, "0");

//   const siteName = scene.site ? scene.site.replace(/\s+/g, "") || "" : "";

//   const performers = scene.performers
//     ? scene.performers.map((p) => p).join(" ")
//     : "";

//   return [
//     `${siteName} ${yy} ${mm} ${dd} ${performers}`,
//     `${siteName} ${performers}`,
//     `${siteName} ${yy} ${mm} ${dd}`,
//     `${yy} ${mm} ${dd} ${performers}`,
//   ];
// }

function parseSceneToTorrentString(scene) {
  if (!scene) return "";

  // Format date → YY MM DD
  var dateString = null;
  if (scene.date) {
    const date = new Date(scene.date);
    if (!isNaN(date)) {
      const yy = String(date.getFullYear()).slice(-2);
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      dateString = `${yy} ${mm} ${dd}`;
    }
  }

  var siteName = null;
  if (scene.site) {
    siteName = scene.site ? scene.site.replace(/\s+/g, "") || "" : "";
  }

  var performers = null;
  if (scene?.performers || scene.performers?.length > 0) {
    performers = scene.performers
      ? scene.performers.map((p) => p).join(" ")
      : "";
  }

  let arr = [];
  if (dateString && siteName && performers) {
    arr.push(`${siteName} ${dateString} ${performers}`);
  }
  if (dateString && siteName) {
    arr.push(`${siteName} ${dateString}`);
  }
  if (siteName && performers) {
    arr.push(`${siteName} ${performers}`);
  }
  if (dateString && performers) {
    arr.push(`${dateString} ${performers}`);
  }

  return arr;
}

async function helperStream(hash) {
  const VideoStream = await fetch(
    `http://127.0.0.1:11470/local-addon/meta/other/bt:${hash}.json`,
    {
      // method: "GET",
      headers: { "Content-Type": "application/json" },
    },
  )
    .then((ele) => ele.json())
    .then((ele) => ele.meta.videos);

  const T_streams = await VideoStream.map((e) => {
    data = e.stream;
    data.name = e.title;
    return data;
  });

  return T_streams;
}

const builder = new addonBuilder(manifest);

app.get("{/:config}/configure", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Addon Config</title>
        <style>
          body { background: #111; color: white; font-family: sans-serif; text-align: center; padding: 40px; }
          .container { max-width: 500px; margin: auto; background: #222; padding: 20px; border-radius: 10px; }
          input { padding: 12px; width: 80%; margin: 10px 0; border-radius: 5px; border: 1px solid #444; background: #333; color: white; }
          button { padding: 12px 20px; cursor: pointer; background: #6b32a8; color: white; border: none; border-radius: 5px; font-weight: bold; }
          #urlBox { margin-top: 20px; display: none; }
          textarea { width: 90%; height: 60px; background: #000; color: #0f0; border: 1px solid #333; padding: 10px; font-size: 12px; resize: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Addon Setup</h1>
          <input id="tpdb" type="text" placeholder="TPDB API Key"><br>
          <input id="torbox" type="text" placeholder="TorBox API Key"><br>
                    
          <button onclick="generate()">Generate Install Link</button>

          <div id="urlBox">
            <p>If the button didn't open Stremio, copy this link and paste it into the Stremio search bar:</p>
            <textarea id="installUrl" readonly></textarea><br><br>
            <button onclick="copyLink()" style="background: #444;">Copy Link</button>
            <button onclick="installNow()" style="background: #e02d2d;">Install Now</button>
          </div>
        </div>

        <script>
          function generate() {
            const tpdb = document.getElementById('tpdb').value;
            const torbox = document.getElementById('torbox').value;
            var manifestUrl;
            // if(!tpdb || !torbox) return alert("Please enter both keys!");
            if(!tpdb && !torbox) {
              manifestUrl = window.location.origin + "/manifest.json";
            } else {
              const config = btoa(JSON.stringify({ tpdb, torbox })).replace(/=/g, "");
              // const config = JSON.stringify({"torbox="+torbox+"/tpdb="+tpdb});
              // const config = JSON.stringify({"torbox=":torbox,"/tpdb=":tpdb});
              manifestUrl = window.location.origin + "/" + config + "/manifest.json";
            } 
            
            // Show the box and set the value
            document.getElementById('urlBox').style.display = 'block';
            document.getElementById('installUrl').value = manifestUrl;
          }

          function copyLink() {
            const copyText = document.getElementById("installUrl");
            copyText.select();
            document.execCommand("copy");
            alert("Link copied! Now paste this in Stremio's search bar.");
          }

          function installNow() {
            const link = document.getElementById('installUrl').value;
            window.location.href = link.replace("http", "stremio");
          }
        </script>
      </body>
    </html>
  `);
});

app.get("{/:config}/manifest.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(manifest);
});

app.get("{/:config}/catalog/:type/:id{/:extra}.json", async (req, res) => {
  const params = Object.fromEntries(new URLSearchParams(req.params?.extra));
  const args = {
    type: req.params?.type || null,
    id: req.params?.id || null,
    config: req.params?.config || null,
    skip: params?.skip || null,
    genre: params?.genre || null,
    search: params?.search || null,
  };

  let skip = args?.skip ? parseInt(args.skip) : 0;

  const apiKeys = args.config ? JSON.parse(atob(args.config)) : null;

  if (args.id == "knaben_top") {
    if (args?.search) {
      if (args.search && args.search.length > 3) {
        let data = await api.knaben_api_hit(args.search, args.genre, skip, 50);
        const results = await push_to_metadata(data);
        res.send({ metas: results });
      } else {
        res.send("No search results found");
      }
    } else {
      let genre = String(args?.genre);
      if (!genre || genre === undefined) {
        genre = "none";
      }
      if (genre == "movie") {
        let data = await api.knaben_api_hit_no_query(skip, 50, category.movie);
        const results = await push_to_metadata(data);
        res.send({ metas: results });
      } else if (genre == "tv") {
        let data = await api.knaben_api_hit_no_query(skip, 50, category.tv);
        const results = await push_to_metadata(data);
        res.send({ metas: results });
      } else if (genre == "anime") {
        let data = await api.knaben_api_hit_no_query(skip, 50, category.anime);
        const results = await push_to_metadata(data);
        res.send({ metas: results });
      } else if (genre == "audio") {
        let data = await api.knaben_api_hit_no_query(skip, 50, category.audio);
        const results = await push_to_metadata(data);
        res.send({ metas: results });
      } else if (genre == "adult") {
        let data = await api.knaben_api_hit_no_query(skip, 50, category.adult);
        const results = await push_to_metadata(data);
        res.send({ metas: results });
      } else {
        let data = await api.knaben_api_hit_no_query_raw(skip, 50);
        const results = await push_to_metadata(data);
        res.send({ metas: results });
      }
    }
  } else if (args.id == "THE_PDB" && apiKeys && apiKeys.tpdb) {
    const skip = args.skip || 0;
    const search = args.search || "";

    if (search) {
      if (search && search.length > 3) {
        let data = await pdbapi.getMetadataFromPDB(
          apiKeys.tpdb,
          args?.genre || "",
          search,
          skip,
        );
        const results = await THEPDB_metadata(data);
        res.send({ metas: results });
      } else {
        res.send("No search results found");
      }
    } else {
      let genre = String(args.genre);
      if (genre === undefined) {
        genre = "none";
      }

      if (genre == "scenes") {
        let data = await pdbapi.getMetadataFromPDB(
          apiKeys.tpdb,
          "scenes",
          search,
          skip,
        );
        const results = await THEPDB_metadata(data);
        res.send({ metas: results });
      } else if (genre == "movies") {
        let data = await pdbapi.getMetadataFromPDB(
          apiKeys.tpdb,
          "movies",
          search,
          skip,
        );
        const results = await THEPDB_metadata(data);
        res.send({ metas: results });
      } else if (genre == "jav") {
        let data = await pdbapi.getMetadataFromPDB(
          apiKeys.tpdb,
          "jav",
          search,
          skip,
        );
        const results = await THEPDB_metadata(data);
        res.send({ metas: results });
      } else {
        let data = await pdbapi.getMetadataFromPDB(
          apiKeys.tpdb,
          "",
          search,
          skip,
        );
        const results = await THEPDB_metadata(data);
        res.send({ metas: results });
      }
    }
  } else {
    res.send("Unknown catalog request");
  }
});

app.get("{/:config}/meta/:type/:id{/:skip}{/:genre}.json", async (req, res) => {
  const params = Object.fromEntries(new URLSearchParams(req.params?.extra));
  const args = {
    type: req.params?.type || null,
    id: req.params?.id || null,
    config: req.params?.config || null,
    skip: params?.skip || null,
    genre: params?.genre || null,
    search: params?.search || null,
  };

  let skip = args?.skip ? parseInt(args.skip) : 0;

  if (args.type && args.id.startsWith("TPDB")) {
    var obj;
    var obj_catalog;
    if (args.type && args.id.startsWith("TPDB-P/")) {
      const [app, catalog, id] = args.id.split("/");
      const apiKeys = args.config ? JSON.parse(atob(args.config)) : null;
      let data = await pdbapi.getMetadataFromPDBforidentifier(
        apiKeys.tpdb,
        catalog,
        id,
      );
      const result = await THEPDB_metadata(data);
      obj = await result[0];
      obj_catalog = catalog.toLowerCase();
    } else if (args.type && args.id.startsWith("TPDB-K/")) {
      const [catalog, id] = args.id.split("/");
      let data = await api.knaben_api_hit_for_hash(id);
      const result = await push_to_metadata(data);
      obj = await result[0];
    } else {
      let data = await api.knaben_api_hit_for_hash(id);
      const result = await push_to_metadata(data);
      obj = await result[0];
    }

    const scene = {
      site: obj.site || null,
      date: obj.released || null,
      performers: obj.performers || null,
    };
    const query = parseSceneToTorrentString(scene);

    if (obj && obj.id) {
      const meta = {
        id: obj.id,
        name: obj.name,
        releaseInfo: obj.releaseInfo,
        poster: obj.poster,
        background: obj.background,
        logo: obj.logo,
        posterShape: "poster",
        type: "movie",
        description: `${obj.name} => ${obj.description}. Queries = ${query}`,
        trailerStreams: obj.trailerStreams || null,
        hash: obj.hash || null,
        magnetUrl: obj.magnetUrl || null,
        bytes: obj.bytes || null,
        site: obj.site,
        performers: obj.performers,
        external_id: obj.external_id,
        released: obj.released,
        catalog: obj_catalog,
      };
      current_meta = meta;

      res.send({ meta: meta });
    }
  } else {
    // otherwise return no meta
    res.send({ meta: {} });
  }
});

app.get("{/:config}/stream/:type/:id{/:extra}.json", async (req, res) => {
  const params = Object.fromEntries(new URLSearchParams(req.params?.extra));
  const args = {
    type: req.params?.type || null,
    id: req.params?.id || null,
    config: req.params?.config || null,
    skip: params?.skip || null,
    genre: params?.genre || null,
    search: params?.search || null,
  };

  let skip = args?.skip ? parseInt(args.skip) : 0;

  if (args.type && args.id.startsWith("TPDB")) {
    var data = [];

    if (args.id.startsWith("TPDB-P")) {
      var query;
      const catalog = current_meta.catalog;
      if (catalog.startsWith("jav")) {
        if (current_meta.external_id) {
          data = await api.knaben_api_hit(current_meta.external_id);
        }
      } else if (catalog.startsWith("movie")) {
        const scene = {
          site: current_meta.site || null,
          date: current_meta.released || null,
          performers: current_meta.performers || null,
        };
        query = [current_meta.name, ...parseSceneToTorrentString(scene)];
        if (query) {
          const api1 = await api.knaben_api_hit(query[0]);
          if (api1.length === 0) {
            var temp = [];
            for (var i = 1; i < query.length - 1; i++) {
              var api2 = await api.knaben_api_hit(query[i]);
              temp = temp.concat(api2);
            }
            data = [...new Set(temp)];
          } else {
            data = [...new Set(api1)];
          }
        }
      } else {
        const scene = {
          site: current_meta.site || null,
          date: current_meta.released || null,
          performers: current_meta.performers || null,
        };
        query = parseSceneToTorrentString(scene);
        if (query) {
          const api1 = await api.knaben_api_hit(query[0]);
          if (api1.length === 0) {
            var temp = [];
            for (var i = 1; i < query.length - 1; i++) {
              var api2 = await api.knaben_api_hit(query[i]);
              temp = temp.concat(api2);
            }
            data = [...new Set(temp)];
          } else {
            data = [...new Set(api1)];
          }
        }
      }
    } else if (args.id.startsWith("TPDB-K")) {
      data = [current_meta];
    } else {
      resolve({ meta: {} });
    }

    var stream = [];
    const apiKeys = args.config ? JSON.parse(atob(args.config)) : null;

    if ((!apiKeys && !apiKeys?.torbox) || apiKeys?.torbox.length === 0) {
      stream = data.map((ele) => ({
        name: `${ele.name}`,
        description: `${(ele.bytes / 1024 / 1024 / 1024).toFixed(2)}GB - ${ele.title}`,
        infoHash: ele.hash,
      }));
    } else {
      const TORBOX_API_KEY = apiKeys.torbox;
      var hashes = await data.map((ele) => ele.hash);
      hashes = await hashes.filter((ele) => ele !== null);

      const availableHashes =
        hashes && hashes !== undefined
          ? await torbox_chech_availability(TORBOX_API_KEY, hashes)
          : [];
      const streamData = data.map((ele) => {
        ele.cached = availableHashes.includes(ele.hash?.toLowerCase())
          ? true
          : false;
        return ele;
      });

      stream = streamData.map((ele) => {
        if (ele.cached) {
          return {
            name: `torbox ⚡`,
            description: `${(ele.bytes / 1024 / 1024 / 1024).toFixed(2)}GB - ${ele.title}`,
            // url: `https://localhost:${PORT}/${TORBOX_API_KEY}/resolve/${ele.hash}/${encodeURIComponent(ele.magnetUrl)}`,
            url: `https://knaben-results.vercel.app/${TORBOX_API_KEY}/resolve/${ele.hash}/${encodeURIComponent(ele.magnetUrl)}`,
          };
        }
        return {
          name: `torbox ⏳`,
          description: `${(ele.bytes / 1024 / 1024 / 1024).toFixed(2)}GB - ${ele.title}`,
          infoHash: ele.hash,
        };
      });
    }

    if (stream.length > 0) {
      res.send({ streams: stream }); // returns streams if any
    } else {
      res.send({ streams: {} }); // returns empty
    }
  } else {
    // otherwise return no meta
    res.send({ streams: {} });
  }
});

const cache = new Map(); // Simple in-memory storage

app.get("/:TORBOX_API_KEY/resolve/:hash/:magnet", async (req, res) => {
  const { hash, magnet } = req.params;
  const decodedMagnet = decodeURIComponent(magnet);

  // 1. Check if we already have a valid link for this hash
  if (cache.has(hash)) {
    return res.redirect(307, cache.get(hash));
  }

  try {
    const TORBOX_API_KEY = req.params?.TORBOX_API_KEY;
    // 2. Not in cache? Hit the TorBox API
    const torboxDownloadLink = await GeneratingRequestDownloadLink(
      TORBOX_API_KEY,
      decodedMagnet,
    );

    if (!torboxDownloadLink) {
      return res.status(404).send("File not found");
    }

    // 3. Store in cache (Expire it after 1 hour to match TorBox link life)
    cache.set(hash, torboxDownloadLink);
    setTimeout(() => cache.delete(hash), 3600000); // 1 hour in ms

    res.redirect(307, torboxDownloadLink);
  } catch (err) {
    res.status(500).send("Streaming error");
  }
});

builder.defineCatalogHandler((args) => {
  return Promise.resolve({ catalog: [] });
});
builder.defineMetaHandler((args) => {
  return Promise.resolve({ meta: [] });
});
builder.defineStreamHandler((args) => {
  return Promise.resolve({ streams: [] });
});
const addonInterface = builder.getInterface();
app.use("/", getRouter(addonInterface));

// 192.168.1.8:7000 -- LOCAL
// app.listen(PORT, "0.0.0.0", () => console.log(`Addon active`));

if (process.env.NODE_ENV !== "production") {
  const port = process.env.PORT || 7000;
  app.listen(port, () => console.log(`Local server on port ${port}`));
}

// IMPORTANT: Export the app for Vercel
module.exports = app;
