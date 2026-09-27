/** 暖阁首页默认块（与 warm-home-blocks.json 同源；小程序 require 须用 .js） */
module.exports = {
  "blocks": [
    {
      "id": "wh-greet",
      "type": "warm_greet",
      "props": {
        "greet_template": "你好",
        "show_notice": true,
        "show_search": true,
        "search_placeholder": "搜索文章、笔记、专栏……",
        "show_nav": true
      }
    },
    {
      "id": "wh-authors",
      "type": "warm_authors",
      "props": {
        "title": "精选作者",
        "more_text": "全部作者 ›",
        "more_url": "/pkg-content/author-list/author-list",
        "more_tab": false
      }
    },
    {
      "id": "wh-feature",
      "type": "warm_feature",
      "props": { "empty_text": "暂无精选内容" }
    },
    {
      "id": "wh-columns",
      "type": "warm_columns",
      "props": {
        "title": "精品专栏",
        "more_text": "全部 ›",
        "more_url": "/pages/shop/shop",
        "more_tab": true
      }
    },
    {
      "id": "wh-planet",
      "type": "warm_planet_rec",
      "props": {
        "title": "我的星球",
        "more_text": "进入 ›",
        "more_url": "/pkg-content/planet-list/planet-list",
        "more_tab": false,
        "feed_url": "/pkg-content/planet-feed/planet-feed?planetId=warm-main"
      }
    },
    {
      "id": "wh-feed",
      "type": "warm_feed",
      "props": { "footer": "— 慢一点，也很好 —" }
    }
  ],
  "shellOverrides": {
    "authors_title": ["authorsTitle", "title", "wh-authors"],
    "columns_title": ["columnsTitle", "title", "wh-columns"],
    "planet_title": ["planetTitle", "title", "wh-planet"]
  }
}

