const knaben_url = "https://api.knaben.org/v1";
const category = {
  audio: 1000000,
  tv: 2000000,
  movie: 3000000,
  adult: 5001000,
  anime: 6000000,
};

const categories = [1000000, 2000000, 3000000, 5001000, 6000000];

export async function knaben_api_hit_no_query_raw(skip, size) {
  console.log("Hit knaben_api_hit_no_query_raw");

  let post_body = {
    from: skip || 0,
    size: size,
    order_by: "seeders",
    order_direction: "desc",
    categories: categories,
  };

  let respone = await fetch(knaben_url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(post_body),
  });
  let data = await respone.json();
  const resp = await data.hits;
  return resp;
}

export async function knaben_api_hit_no_query(skip, size, category) {
  console.log("Hit knaben_api_hit_no_query");
  const categories = !category
    ? [1000000, 2000000, 3000000, 5001000, 6000000]
    : [category];
  let post_body = {
    from: skip || 0,
    size: size,
    categories: categories,
    order_by: "seeders",
    order_direction: "desc",
  };

  let respone = await fetch(knaben_url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(post_body),
  });
  let data = await respone.json();
  const resp = await data.hits;
  return resp;
}

export async function knaben_api_hit(query, genre, skip, size) {
  console.log("Hit knaben_api_hit");
  const categories = !genre
    ? [1000000, 2000000, 3000000, 5001000, 6000000]
    : [category[genre]];
  let post_body = {
    from: skip || 0,
    size: size,
    search_field: "title",
    categories: categories,
    query: query,
    search_type: "70%",
  };
  let respone = await fetch(knaben_url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(post_body),
  });

  let data = await respone.json();
  const resp = await data.hits;
  return resp;
}

export async function knaben_api_hit_for_hash(hash) {
  console.log("Hit knaben_api_hit_for_hash");
  try {
    let post_body = {
      search_field: "hash",
      query: hash,
    };

    let respone = await fetch(knaben_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post_body),
    });

    let data = await respone.json();
    const resp = await data.hits;

    return resp;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.log("Invalid JSON:", error);
    } else {
      console.log("Network or other error:", error);
    }
  }
}
