# BATCH-QA-020 API Regression
## Auth 401
{"code":110101,"message":"未登录"}
HTTP:401
## Order detail
{"code":200,"message":"操作成功","data":{"id":1,"orderNo":"NO202605120001","userId":1,"userNickname":"张小明","paymentMethod":"wechat","totalAmount":199.00,"payAmount":179.00,"discountAmount":20.00,"freightAmount":0.00,"status":"shipped","statusDesc":"已发货","fulfillmentType":"physical","autoFulfill":false,"remark":"本地联调订单","addressSnapshot":{"name":"张小明","phone":"13800000001","address":"本地联调地址"},"logisticsCompany":"é¡ºä¸°é€Ÿè¿","logisticsNo":"SF1234567890","paidAt":"2026-05-12 10:30:00","shippedAt":"2026-05-13 09:00:00","items":[{"id":1,"productId":1,"skuId":1,"productName":"品牌文创礼盒","skuName":"标准礼盒","productImage":"","price":199.00,"quantity":1,"subtotal":199.00}],"createdAt":"2026-07-22 12:55:55","updatedAt":"2026-08-16 00:01:55"}}
## User list
{"code":200,"message":"操作成功","data":{"records":[{"id":1,"openid":"dev-openid-001","nickname":"张小明","phone":"13800000001","avatar":"","points":1280,"levelId":3,"levelName":"金卡会员","sourceChannel":"local-dev","sourceChannelLabel":"local-dev","lastVisitAt":"2026-07-22 12:55:55","createTime":"2026-07-22 12:55:55","orderCount":1,"formCount":0,"actCount":0,"totalSpent":179.00,"tags":["local-dev","金卡会员","已下单"],"activities":[{"content":"最近访问小程序","time":"2026-07-22 12:55:55"}]}],"total":1,"current":1,"size":3,"page_size":3,"page":1}}
## Member levels
{"code":200,"message":"操作成功","data":[{"id":1,"name":"普通会员","icon":"","minPoints":0,"discountRate":1.00,"pointsRate":1.00,"benefits":[],"rights":["基础功能使用"],"sortOrder":1,"status":1,"memberCount":0,"createdAt":"2026-07-22 12:55:55","updatedAt":"2026-07-22 12:55:55"},{"id":2,"name":"银卡会员","icon":"","minPoints":500,"discountRate":0.95,"pointsRate":1.00,"benefits":[],"rights":["积分兑换资格"],"sortOrder":2,"status":1,"memberCount":0,"createdAt":"2026-07-22 12:55:55","updatedAt":"2026-07-22 12:55:55"},{"id":3,"name":"金卡会员","icon":"","minPoints":1000,"discountRate":0.90,"pointsRate":1.00,"benefits":[],"rights":["全年9折","积分加速","活动优先报名"],"sortOrder":3,"status":1,"memberCount":1,"createdAt":"2026-07-22 12:55:55","updatedAt":"2026-07-22 12:55:55"},{"id":4,"name":"钻石会员","icon":"","minPoints":3000,"discountRate":0.85,"pointsRate":1.00,"benefits":[],"rights":["全年85折","专属客服","生日双倍积分"],"sortOrder":4,"status":1,"memberCount":0,"createdAt":"2026-07-22 12:55:55","updatedAt":"2026-07-22 12:55:55"}]}
## Finance dashboard
{"code":200,"message":"操作成功","data":{"totalIncome":179.00,"totalExpense":0,"netProfit":179.00,"pendingInvoiceCount":0,"budgetUsageRate":0}}
## Points log
{"code":200,"message":"操作成功","data":{"records":[{"id":1,"userId":1,"userNickname":"张小明","points":1280,"type":"admin","description":"账户积分初始化","createdAt":"2026-08-13 19:14:58"}],"total":1,"current":1,"size":3,"page_size":3,"page":1}}
## Workbench ranking
[
  {
    "name": "会员数字权益卡",
    "sales": 286,
    "price": 99.0
  },
  {
    "name": "品牌文创礼盒",
    "sales": 124,
    "price": 199.0
  },
  {
    "name": "品牌定制马克杯",
    "sales": 56,
    "price": 89.0
  }
]
