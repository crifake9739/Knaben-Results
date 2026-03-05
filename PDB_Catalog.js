const PDBurl = "https://api.theporndb.net";
const catalogs = { scenes: "/scenes", movies: "/movies", jav: "/jav" };

export async function getMetadataFromPDB(PDB_api_key, catalog, query, skip) {
  catalog = catalog.toLowerCase();
  catalog =
    catalog == "movies" || catalog == "movie"
      ? catalogs.movies
      : catalog == "jav"
        ? catalogs.jav
        : catalogs.scenes;
  skip = parseInt(skip / 20 + 1) || 1;
  const date = new Date();
  date.setDate(date.getDate() - 1); // Subtract one day
  const formattedDate = date.toISOString().split("T")[0];
  let params =
    query && query.length > 3
      ? {
          q: query,
          orderBy: "recently_released",
          date: formattedDate,
          date_operation: "<",
          per_page: 20,
          page: skip,
        }
      : {
          orderBy: "recently_released",
          date: formattedDate,
          date_operation: "<",
          per_page: 20,
          page: skip,
        };

  var url = new URL(`${PDBurl}${catalog}`);
  url.search = new URLSearchParams(params).toString();

  var response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${PDB_api_key}` },
    // })
  })
    .then((ele) => ele.json())
    .then((ele) => ele.data);

  if (
    query &&
    query.length > 3 &&
    catalog == catalogs.scenes &&
    response.length === 0
  ) {
    url = new URL(`${PDBurl}${catalogs.jav}`);
    url.search = new URLSearchParams(params).toString();
    response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${PDB_api_key}` },
      // })
    })
      .then((ele) => ele.json())
      .then((ele) => ele.data);
  }

  if (
    query &&
    query.length > 3 &&
    catalog == catalogs.scenes &&
    response.length === 0
  ) {
    url = new URL(`${PDBurl}${catalogs.movies}`);
    url.search = new URLSearchParams(params).toString();
    response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${PDB_api_key}` },
      // })
    })
      .then((ele) => ele.json())
      .then((ele) => ele.data);
  }

  if (response) {
    const metas = await response.map((ele) => ({
      id: `${ele.type}/${ele.id}`,
      title: ele.title || ele.slug,
      type: ele.type,
      description: ele.description,
      url: ele.url,
      date: ele.date,
      image: ele.image,
      poster: ele.poster,
      trailer: ele.trailer,
      duration: ele.duration,
      background: ele.background.full,
      performers: ele.performers[0] ? ele.performers.map((e) => e.name) : null,
      site: ele.site.network?.name || ele.site.name || null,
      tags: ele.tags[0] ? ele.tags.map((e) => e.name) : null,
    }));

    return metas;
  } else {
    return [];
  }
}

export async function getMetadataFromPDBforidentifier(
  PDB_api_key,
  catalog,
  identifier,
  skip,
) {
  catalog = catalog.toLowerCase();
  catalog =
    catalog == "movie"
      ? catalogs.movies
      : catalog == "jav"
        ? catalogs.jav
        : catalogs.scenes;
  skip = parseInt(skip / 20 + 1) || 1;
  let params = { orderBy: "most_relevant", per_page: 20, page: skip };
  identifier = identifier && identifier.length > 3 ? identifier : "";
  const url = new URL(`${PDBurl}${catalog}/${identifier}`);
  url.search = new URLSearchParams(params).toString();

  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${PDB_api_key}` },
  })
    .then((ele) => ele.json())
    .then((ele) => ele.data);

  if (response) {
    const meta = {
      id: response.id,
      title: response.title || response.slug,
      type: response.type,
      description: response.description,
      url: response.url,
      date: response.date,
      image: response.image,
      poster: response.poster,
      trailer: response.trailer,
      duration: response.duration,
      background: response.background.full,
      performers: response.performers[0]
        ? response.performers.map((e) => e.name)
        : null,
      site: response.site?.network?.name || response.site?.name || null,
      tags: response.tags[0] ? response.tags.map((e) => e.name) : null,
      external_id: response.external_id,
    };

    return [meta];
  } else {
    return [];
  }
}
