var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
const secretkey = 'ashdgjgssfdgSFGF'
const fs = require('fs');
const xlsx = require('xlsx');

var pool = require('./pool');


const util = require('util');
const queryAsync = util.promisify(pool.query).bind(pool);





async function getlist(status, id) {
  try {
      let result;
      if (status == false) {
          result = await queryAsync(`SELECT * FROM users WHERE id = '${id}'`);
      } else {
          result = await queryAsync(`SELECT * FROM users WHERE status = '${status}'`);
      }
      return result;
  } catch (error) {
      console.error('Error while fetching user:', error);
      throw new Error('Internal server error');
  }
}



async function profile(id) {
  try {
       let result = await queryAsync(`SELECT * FROM users WHERE id = '${id}'`);
      return result;
  } catch (error) {
      console.error('Error while fetching user:', error);
      throw new Error('Internal server error');
  }
}


async function update(id, data) {
  try {
    let result = await queryAsync(`UPDATE users SET ? WHERE id = '${id}'`, data);
    return result;
  } catch (error) {
    console.error('Error while updating user:', error);
    throw new Error('Internal server error');
  }
}




async function getOrder(value) {
    try {
        let result;
        if (value == 'pending' || value == 'ongoing' || value == 'completed') {
            result = await queryAsync(`SELECT o.*, u.name as username, u.number as usernumber, u.unique_id as uniqueid 
                                       FROM orders o 
                                       JOIN users u ON u.id = o.userid 
                                       WHERE o.status = ? 
                                       ORDER BY o.id DESC 
                                       LIMIT 1000`, [value]);
        } else {
            result = await queryAsync(`SELECT o.*, u.name as username, u.number as usernumber, u.unique_id as uniqueid 
                                       FROM orders o 
                                       JOIN users u ON u.id = o.userid 
                                       WHERE o.userid = ? 
                                       ORDER BY o.id DESC`, [value]);
        }
        return result;
    } catch (error) {
        console.error('Error while fetching user:', error);
        throw new Error('Internal server error');
    }
}


async function getOrdersWithFullDetails(filters) {
  const {
    status,
    userid,
    orderid,
    q,
    limit = 50,
    offset = 0
  } = filters;

  const where = [];
  const params = [];

  if (status && ['pending', 'ongoing', 'completed'].includes(status)) {
    where.push('o.status = ?');
    params.push(status);
  }

  if (userid) {
    where.push('o.userid = ?');
    params.push(userid);
  }

  if (orderid) {
    where.push('o.orderid = ?');
    params.push(orderid);
  }

  if (q) {
    where.push(`(
      o.orderid LIKE ?
      OR u.name LIKE ?
      OR u.number LIKE ?
      OR u.unique_id LIKE ?
      OR u.email LIKE ?
      OR u.firm_name LIKE ?
    )`);
    const like = `%${q}%`;
    params.push(like, like, like, like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // 1) Total count (no group by needed)
  const countSql = `
    SELECT COUNT(*) AS total
    FROM orders o
    JOIN users u ON u.id = o.userid
    ${whereSql}
  `;
  const countRes = await queryAsync(countSql, params);
  const total = countRes?.[0]?.total || 0;

  /**
   * 2) Orders + User + Latest Payment Intent + Latest Payment Response
   *    Use derived tables that pick the latest row PER order (receipt/orderid)
   *    so we still get 1 row per order without GROUP BY.
   */

  const ordersSql = `
    SELECT
      o.id,
      o.userid,
      o.orderid,
      o.status,
      o.amount,
      o.created_at,
      o.updated_at,
      o.address,
      o.delivery_partner,
      o.awp_no,
      o.delivery_link,

      u.name AS username,
      u.number AS usernumber,
      u.unique_id AS uniqueid,
      u.email,
      u.firm_name,
      u.gst,

      -- latest payment intent (by receipt = orderid)
      pi.id AS payment_intent_id,
      pi.razorpay_order_id AS pi_razorpay_order_id,
      pi.status AS pi_status,
      pi.total_amount AS pi_total_amount,
      pi.wallet_used AS pi_wallet_used,
      pi.payable_amount AS pi_payable_amount,
      pi.created_at AS pi_created_at,

      -- latest payment response (by orderid)
      pr.id AS payment_response_id,
      pr.razorpay_payment_id,
      pr.razorpay_order_id AS pr_razorpay_order_id,
      pr.txnid,
      pr.amount AS pr_amount,
      pr.type AS payment_type,
      pr.name AS payer_name,
      pr.address AS payer_address,
      pr.created_at AS payment_created_at

    FROM orders o
    JOIN users u ON u.id = o.userid

    LEFT JOIN (
      SELECT p1.*
      FROM payment_intent p1
      JOIN (
        SELECT receipt, MAX(id) AS max_id
        FROM payment_intent
        GROUP BY receipt
      ) p2 ON p2.receipt = p1.receipt AND p2.max_id = p1.id
    ) pi ON pi.receipt = o.orderid

    LEFT JOIN (
      SELECT r1.*
      FROM payment_response r1
      JOIN (
        SELECT orderid, MAX(id) AS max_id
        FROM payment_response
        GROUP BY orderid
      ) r2 ON r2.orderid = r1.orderid AND r2.max_id = r1.id
    ) pr ON pr.orderid = o.orderid

    ${whereSql}
    ORDER BY o.id DESC
    LIMIT ? OFFSET ?
  `;

  const orders = await queryAsync(ordersSql, [...params, limit, offset]);

  // If no orders, return early
  if (!orders || orders.length === 0) {
    return { rows: [], total };
  }

  // 3) Fetch items (booking + product) for these orders (single query)
  const orderIds = orders.map(o => o.orderid);
  const placeholders = orderIds.map(() => '?').join(',');

  const itemsSql = `
    SELECT
      b.orderid,
      b.id AS booking_id,
      b.userid,
      b.productid,
      b.amount,
      b.quantity,
      b.category,
      b.address AS booking_address,
      b.status AS booking_status,
      b.delivery_link AS booking_delivery_link,
      b.delivery_partner AS booking_delivery_partner,
      b.awp_no AS booking_awp_no,
      b.created_at AS booking_created_at,
      b.updated_at AS booking_updated_at,

      p.name AS product_name,
      p.category AS product_category,
      p.subcategory,
      p.brand,
      p.skuno,
      p.modelno,
      p.price,
      p.tax_type,
      p.warranty

    FROM booking b
    LEFT JOIN product p ON p.id = b.productid
    WHERE b.orderid IN (${placeholders})
    ORDER BY b.id DESC
  `;

  const items = await queryAsync(itemsSql, orderIds);

  // 4) Attach items to orders in Node.js
  const itemsByOrder = new Map();
  for (const it of items) {
    if (!itemsByOrder.has(it.orderid)) itemsByOrder.set(it.orderid, []);
    itemsByOrder.get(it.orderid).push(it);
  }

  const rows = orders.map(o => {
    const orderItems = itemsByOrder.get(o.orderid) || [];

    // fallback shipping details from booking if missing in orders table
    const fallback = orderItems[0] || {};
    return {
      ...o,
      address: o.address || fallback.booking_address || null,
      delivery_partner: o.delivery_partner || fallback.booking_delivery_partner || null,
      awp_no: o.awp_no || fallback.booking_awp_no || null,
      delivery_link: o.delivery_link || fallback.booking_delivery_link || null,

      items_count: orderItems.length,
      items: orderItems
    };
  });

  return { rows, total };
}





async function getTransaction(value) {
    try {
      let result;
      if (value === 'all') {
        result = await queryAsync(`
          SELECT t.*, u.name AS username, u.number AS usernumber, u.unique_id AS uniqueid
          FROM transaction t
          JOIN users u ON t.userid = u.id
          ORDER BY t.id DESC
          LIMIT 1000
        `);
      } else {
        result = await queryAsync(`
          SELECT t.*, u.name AS username, u.number AS usernumber, u.unique_id AS uniqueid
          FROM transaction t
          JOIN users u ON t.userid = u.id
          WHERE t.userid = '${value}'
          ORDER BY t.id DESC
        `);
      }
      return result;
    } catch (error) {
      console.error('Error while fetching user:', error);
      throw new Error('Internal server error');
    }
  }
  


  // async function getLogs(value) {
  //   try {
  //     let result;
  //     if (value == 'all') {
  //       result = await queryAsync(`SELECT t.*, u.name as username, u.number as usernumber, u.unique_id as uniqueid
  //                                   FROM user_activity_log t
  //                                   JOIN users u ON u.id = t.userid
  //                                   ORDER BY t.id DESC
  //                                   LIMIT 1000`);
  //     } else {
  //       result = await queryAsync(`SELECT t.*, u.name as username, u.number as usernumber, u.unique_id as uniqueid
  //                                   FROM user_activity_log t
  //                                   JOIN users u ON u.id = t.userid
  //                                   WHERE t.userid = '${value}'
  //                                   ORDER BY t.id DESC`);
  //     }
  //     return result;
  //   } catch (error) {
  //     console.error('Error while fetching logs:', error);
  //     throw new Error('Internal server error');
  //   }
  // }
  

  // models/user.js (or your user model file)

function safeParseJSON(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  if (typeof val !== 'string') return null;

  try {
    return JSON.parse(val);
  } catch {
    try {
      const maybe = JSON.parse(val);
      if (typeof maybe === 'string') return JSON.parse(maybe);
      return maybe;
    } catch {
      return null;
    }
  }
}

function getFilterTableByCategory(category) {
  const c = String(category || '').trim().toLowerCase();
  if (c === 'laptop') return 'laptop_filters';
  if (c === 'apple') return 'apple_filters';
  if (c === 'accessories') return 'parts_and_accessories_filters';
  if (c === 'mobile') return 'mobile_filters';
  return null;
}

function toIntOrNull(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function collectFilterIdsFromQuery(queryObj) {
  if (!queryObj || typeof queryObj !== 'object') return [];
  const keys = ['brand', 'generation', 'laptop_type', 'subcategory', 'filters', 'condition'];
  const ids = [];
  for (const k of keys) {
    const n = toIntOrNull(queryObj[k]);
    if (n !== null) ids.push(n);
  }
  return [...new Set(ids)];
}

function getEffectiveCategory(row) {
  return row?.query?.category || row?.category || null;
}

function getEffectiveProductId(row) {
  // priority: DB column -> query.id -> query.product_id
  const fromCol = toIntOrNull(row?.product_id);
  if (fromCol) return fromCol;

  const fromQueryId = toIntOrNull(row?.query?.id);
  if (fromQueryId) return fromQueryId;

  const fromQueryPid = toIntOrNull(row?.query?.product_id);
  if (fromQueryPid) return fromQueryPid;

  return null;
}

async function getLogs(value) {
  try {
    let rows;

    if (value === 'all') {
      rows = await queryAsync(
        `SELECT 
            t.*,
            u.name AS username,
            u.number AS usernumber,
            u.unique_id AS uniqueid
         FROM user_activity_log t
         JOIN users u ON u.id = t.userid
         ORDER BY t.id DESC
         LIMIT 1000`
      );
    } else {
      const userid = Number(value);
      if (!userid) return [];

      rows = await queryAsync(
        `SELECT 
            t.*,
            u.name AS username,
            u.number AS usernumber,
            u.unique_id AS uniqueid
         FROM user_activity_log t
         JOIN users u ON u.id = t.userid
         WHERE t.userid = ?
         ORDER BY t.id DESC
         LIMIT 1000`,
        [userid]
      );
    }

    if (!Array.isArray(rows) || rows.length === 0) return [];

    // 1) Parse query_json, attach query/filter_details/product_details placeholders
    const enriched = rows.map((r) => {
      const queryObj = safeParseJSON(r.query_json);
      return {
        ...r,
        query: queryObj || null,
        filter_details: null,
        product_details: null
      };
    });

    // 2) Filter enrichment - batch ids per category-table
    const tableToIds = new Map(); // table -> Set(ids)
    const rowNeedsFilter = []; // { row, table }

    for (const row of enriched) {
      const category = getEffectiveCategory(row);
      const table = getFilterTableByCategory(category);
      if (!table) continue;

      const ids = collectFilterIdsFromQuery(row.query);
      if (!ids.length) continue;

      if (!tableToIds.has(table)) tableToIds.set(table, new Set());
      const set = tableToIds.get(table);
      ids.forEach((id) => set.add(id));

      rowNeedsFilter.push({ row, table });
    }

    const tableToCache = new Map(); // table -> Map(id -> filterRow)

    for (const [table, idSet] of tableToIds.entries()) {
      const ids = [...idSet];
      if (!ids.length) continue;

      const placeholders = ids.map(() => '?').join(',');
      const filterRows = await queryAsync(
        `SELECT id, name, image, filters, status, created_at, updated_at
         FROM ${table}
         WHERE id IN (${placeholders})`,
        ids
      );

      const cache = new Map();
      if (Array.isArray(filterRows)) {
        for (const fr of filterRows) cache.set(Number(fr.id), fr);
      }
      tableToCache.set(table, cache);
    }

    for (const { row, table } of rowNeedsFilter) {
      const cache = tableToCache.get(table);
      if (!cache || !row.query) continue;

      const out = {};
      const keysToMap = ['brand', 'generation', 'laptop_type', 'subcategory', 'filters', 'condition'];

      for (const k of keysToMap) {
        const id = toIntOrNull(row.query[k]);
        if (id === null) continue;
        const fr = cache.get(id);
        if (fr) out[k] = fr;
      }

      row.filter_details = Object.keys(out).length ? out : null;
    }

    // 3) Product enrichment - batch all product ids
    const productIds = new Set();
    for (const row of enriched) {
      const pid = getEffectiveProductId(row);
      if (pid) productIds.add(pid);
    }

    if (productIds.size > 0) {
      const ids = [...productIds];
      const placeholders = ids.map(() => '?').join(',');

      const products = await queryAsync(
        `SELECT 
            id, name, category, skuno, modelno, subcategory, brand, description, price, quantity, created_at, status, updated_at,
            in_app, accessories_storage, warranty, battery_count_cycle, margin_price, tax_type
         FROM product
         WHERE id IN (${placeholders})`,
        ids
      );

      const productMap = new Map();
      if (Array.isArray(products)) {
        for (const p of products) productMap.set(Number(p.id), p);
      }

      for (const row of enriched) {
        const pid = getEffectiveProductId(row);
        if (pid && productMap.has(pid)) {
          row.product_details = productMap.get(pid);
        }
      }
    }

    return enriched;
  } catch (error) {
    console.error('Error while fetching logs:', error);
    throw new Error('Internal server error');
  }
}




  // async function getTransactionDetails(value, id) {
  //   try {
  //     let result;
  //     console.log('value', value);
  //     if (value === 'credit') {
  //       result = await queryAsync(`
  //         SELECT 
  //           p.*, 
  //           u.name AS username, 
  //           u.number AS usernumber, 
  //           u.unique_id AS uniqueid 
  //         FROM 
  //           payment_response p 
  //           INNER JOIN users u ON p.userid = u.id 
  //         WHERE 
  //           p.orderid = '${id}'
  //       `);
  //     } else {
  //       result = await queryAsync(`
  //         SELECT 
  //           b.*, 
  //           u.name AS username, 
  //           u.number AS usernumber, 
  //           u.unique_id AS uniqueid, 
  //           p.name AS productname, 
  //           o.status AS orderstatus 
  //         FROM 
  //           booking b 
  //           INNER JOIN users u ON b.userid = u.id 
  //           LEFT JOIN product p ON b.productid = p.id 
  //           LEFT JOIN orders o ON b.orderid = o.orderid 
  //         WHERE 
  //           b.orderid = '${id}'
  //       `);
  //     }
  //     return result;
  //   } catch (error) {
  //     console.error('Error while fetching user:', error);
  //     throw new Error('Internal server error');
  //   }
  // }
  


async function getTransactionDetails(type, orderId) {
  try {
    if (type === 'credit') {
      // Wallet recharge / credit transaction
      const rows = await queryAsync(
        `
        SELECT 
          pr.*,
          u.name AS username,
          u.email AS useremail,
          u.number AS usernumber,
          u.unique_id AS uniqueid,
          u.firm_name AS firm_name,
          u.gst AS gst
        FROM payment_response pr
        INNER JOIN users u ON pr.userid = u.id
        WHERE pr.orderid = ?
        ORDER BY pr.id DESC
        `,
        [orderId]
      );

      return {
        type: 'credit',
        header: rows?.[0] || null,
        items: [],
        payment: null,
        raw: rows
      };
    }

    // -------------------------
    // BOOKING ORDER DETAILS
    // -------------------------

    // 1) Items (booking lines) + product details
    const items = await queryAsync(
      `
      SELECT
        b.id AS booking_id,
        b.userid,
        b.orderid,
        b.productid,
        b.category AS booking_category,
        b.quantity,
        b.amount AS line_amount,
        b.status AS booking_status,
        b.address AS booking_address,
        b.delivery_link AS booking_delivery_link,
        b.delivery_partner AS booking_delivery_partner,
        b.awp_no AS booking_awb_no,
        b.created_at AS booking_created_at,
        b.updated_at AS booking_updated_at,

        p.name AS product_name,
        p.category AS product_category,
        p.subcategory AS product_subcategory,
        p.brand AS product_brand,
        p.skuno AS product_sku,
        p.modelno AS product_modelno,
        p.description AS product_description,
        p.price AS product_price,
        p.tax_type AS product_tax_type,
        p.warranty AS product_warranty,
        p.accessories_storage AS product_accessories_storage,
        p.battery_count_cycle AS product_battery_count_cycle
      FROM booking b
      LEFT JOIN product p ON b.productid = p.id
      WHERE b.orderid = ?
      ORDER BY b.id ASC
      `,
      [orderId]
    );

    // 2) Order header + user details + address fallback
    // Address priority: orders.address -> booking.address (first item) -> ''
    const headerRows = await queryAsync(
      `
      SELECT
        o.id AS order_pk,
        o.userid,
        o.orderid,
        o.amount AS order_amount,
        o.status AS order_status,
        o.created_at AS order_created_at,
        o.updated_at AS order_updated_at,
        o.delivery_link AS order_delivery_link,
        o.delivery_partner AS order_delivery_partner,
        o.awp_no AS order_awb_no,
        o.address AS order_address,

        u.name AS username,
        u.email AS useremail,
        u.number AS usernumber,
        u.unique_id AS uniqueid,
        u.firm_name AS firm_name,
        u.gst AS gst,
        u.wallet AS wallet_balance,

        COALESCE(o.address, baddr.address, '') AS resolved_address
      FROM orders o
      INNER JOIN users u ON o.userid = u.id
      LEFT JOIN (
        SELECT orderid, MAX(address) AS address
        FROM booking
        WHERE orderid = ?
        GROUP BY orderid
      ) baddr ON baddr.orderid = o.orderid
      WHERE o.orderid = ?
      LIMIT 1
      `,
      [orderId, orderId]
    );

    const header = headerRows?.[0] || null;

    // 3) Payment response (actual payment record)
    const payRespRows = await queryAsync(
      `
      SELECT
        pr.id AS payment_response_id,
        pr.userid,
        pr.orderid,
        pr.amount AS paid_amount,
        pr.txnid,
        pr.razorpay_payment_id,
        pr.razorpay_order_id,
        pr.razorpay_signature,
        pr.type AS payment_type,
        pr.name AS payer_name,
        pr.address AS payer_address,
        pr.created_at AS payment_created_at
      FROM payment_response pr
      WHERE pr.orderid = ?
      ORDER BY pr.id DESC
      LIMIT 1
      `,
      [orderId]
    );
    const paymentResponse = payRespRows?.[0] || null;

    // 4) Payment intent (wallet_used, payable_amount, etc.)
    // We try to match by:
    // - Razorpay order id from payment_response, OR
    // - receipt = our internal orderId
    const payIntentRows = await queryAsync(
      `
      SELECT
        pi.id AS payment_intent_id,
        pi.userid,
        pi.razorpay_order_id AS intent_razorpay_order_id,
        pi.receipt,
        pi.total_amount,
        pi.wallet_used,
        pi.payable_amount,
        pi.status AS intent_status,
        pi.created_at AS intent_created_at,
        pi.updated_at AS intent_updated_at
      FROM payment_intent pi
      WHERE (pi.receipt = ? OR pi.razorpay_order_id = ?)
      ORDER BY pi.id DESC
      LIMIT 1
      `,
      [orderId, paymentResponse?.razorpay_order_id || '']
    );
    const paymentIntent = payIntentRows?.[0] || null;

    // Totals (computed)
    const totals = items.reduce(
      (acc, row) => {
        acc.totalQty += Number(row.quantity || 0);
        acc.totalLineAmount += Number(row.line_amount || 0);
        return acc;
      },
      { totalQty: 0, totalLineAmount: 0 }
    );

    return {
      type: 'booking',
      header,
      items,
      totals,
      payment: {
        intent: paymentIntent,
        response: paymentResponse
      },
      audit: {
        order_created_at: header?.order_created_at || null,
        order_updated_at: header?.order_updated_at || null
      }
    };

  } catch (error) {
    console.error('Error while fetching transaction details:', error);
    throw new Error('Internal server error');
  }
}



async function updateOrders(id, data) {
    try {
        console.log('orderid',id)
        console.log('data',data)
      let result = await queryAsync(`UPDATE orders SET ? WHERE orderid = '${id}'`, data);
      let result1 = await queryAsync(`UPDATE booking SET ? WHERE orderid = '${id}'`,data);
      return result;
    } catch (error) {
      console.error('Error while updating user:', error);
      throw new Error('Internal server error');
    }
  }



async function getFilter(filtertable,filters){
  try {
     let result = await queryAsync(`select * from ${filtertable} where filters = '${filters}' and status = true order by name`);
     return result;
  } catch (error) {
    console.error('Error while updating user:', error);
    throw new Error('Internal server error');
  }
}  



async function fetch_name(data) {

  try {
    if(data.category == 'mobile'){
      let ramname = await getDatas('mobile_filters',data.ram)
      return  data.modelno + ' | ' + ramname + ' | ' +  data.storage 
  }
  
  if(data.category == 'laptop'){
      let processorname = await getDatas('laptop_filters',data.processor)
      let generationname = await getDatas('laptop_filters',data.generation)
      let ramname = await getDatas('laptop_filters',data.ram)
  
  
  
      return  data.modelno + ' | ' + processorname + ' | ' + generationname + ' | ' + ramname + ' | ' + data.storage 
  }
  
  
  if(data.category == 'apple'){
      let processorname = await getDatas('apple_filters',data.processor)
      let subcategoryrname = await getDatas('apple_filters',data.subcategory)
  
    
  
  
  
      return  data.modelno + ' | ' + subcategoryrname + ' | ' + processorname  
  }
  
  
  
  if(data.category == 'accessories' || data.category == 'new_parts' || data.category == 'refurbished_parts'){
      let brandname = await getDatas('parts_and_accessories_filters',data.brand)
     
      return  data.modelno + ' | ' + brandname + ' | ' + data.category.toUpperCase() 
  }
  
  
  } catch (error) {
    console.error('Error while fetching')
    throw new Error('Internal Server Error')
  }
  
}


async function getOrderFullDetails(orderid) {
  // 1) Order + User (single row)
  const orderSql = `
    SELECT
      o.id AS order_db_id,
      o.userid,
      o.orderid,
      o.status AS order_status,
      o.amount AS order_amount,
      o.created_at AS order_created_at,
      o.updated_at AS order_updated_at,
      o.address AS order_address,
      o.delivery_partner AS order_delivery_partner,
      o.awp_no AS order_awp_no,
      o.delivery_link AS order_delivery_link,

      u.name AS username,
      u.email AS useremail,
      u.number AS usernumber,
      u.unique_id AS uniqueid,
      u.firm_name,
      u.gst,
      u.wallet
    FROM orders o
    JOIN users u ON u.id = o.userid
    WHERE o.orderid = ?
    LIMIT 1
  `;
  const orderRes = await queryAsync(orderSql, [orderid]);
  const row = orderRes?.[0];

  if (!row) {
    return {
      order: null, user: null, shipping: null,
      paymentIntent: null, paymentResponse: null, items: []
    };
  }

  // 2) Items (booking + product)
  const itemsSql = `
    SELECT
      b.id AS booking_id,
      b.userid,
      b.orderid,
      b.productid,
      b.amount AS line_amount,
      b.quantity,
      b.category AS booking_category,
      b.address AS booking_address,
      b.status AS booking_status,
      b.delivery_link AS booking_delivery_link,
      b.delivery_partner AS booking_delivery_partner,
      b.awp_no AS booking_awp_no,
      b.created_at AS booking_created_at,
      b.updated_at AS booking_updated_at,

      p.name AS product_name,
      p.category AS product_category,
      p.subcategory,
      p.brand,
      p.skuno,
      p.modelno,
      p.description,
      p.price AS product_mrp,
      p.tax_type,
      p.warranty,
      p.accessories_storage,
      p.battery_count_cycle,
      p.margin_price,
      p.in_app,
      p.status AS product_status
    FROM booking b
    LEFT JOIN product p ON p.id = b.productid
    WHERE b.orderid = ?
    ORDER BY b.id DESC
  `;
  const items = await queryAsync(itemsSql, [orderid]);

  // 3) Latest Payment Intent (prefer receipt = orderid)
  const piSql = `
    SELECT p1.*
    FROM payment_intent p1
    JOIN (
      SELECT receipt, MAX(id) AS max_id
      FROM payment_intent
      WHERE receipt = ?
      GROUP BY receipt
    ) p2 ON p2.receipt = p1.receipt AND p2.max_id = p1.id
    LIMIT 1
  `;
  const piRes = await queryAsync(piSql, [orderid]);
  const paymentIntent = piRes?.[0] || null;

  // 4) Latest Payment Response (orderid = orderid)
  const prSql = `
    SELECT r1.*
    FROM payment_response r1
    JOIN (
      SELECT orderid, MAX(id) AS max_id
      FROM payment_response
      WHERE orderid = ?
      GROUP BY orderid
    ) r2 ON r2.orderid = r1.orderid AND r2.max_id = r1.id
    LIMIT 1
  `;
  const prRes = await queryAsync(prSql, [orderid]);
  const paymentResponse = prRes?.[0] || null;

  // 5) Shipping / delivery fallbacks from booking (if orders table missing)
  const firstItem = items?.[0] || {};
  const shipping = {
    address: row.order_address || firstItem.booking_address || '-',
    delivery_partner: row.order_delivery_partner || firstItem.booking_delivery_partner || '-',
    awp_no: row.order_awp_no || firstItem.booking_awp_no || '-',
    delivery_link: row.order_delivery_link || firstItem.booking_delivery_link || '-'
  };

  return {
    order: {
      id: row.order_db_id,
      userid: row.userid,
      orderid: row.orderid,
      status: row.order_status,
      amount: row.order_amount,
      created_at: row.order_created_at,
      updated_at: row.order_updated_at
    },
    user: {
      name: row.username,
      email: row.useremail,
      number: row.usernumber,
      uniqueid: row.uniqueid,
      firm_name: row.firm_name,
      gst: row.gst,
      wallet: row.wallet
    },
    shipping,
    paymentIntent,
    paymentResponse,
    items: items || []
  };
}

async function getPaymentOnlyDetails(paymentId) {
  const sql = `
    SELECT p.*, u.name AS username, u.number AS usernumber, u.unique_id AS uniqueid
    FROM payment_response p
    JOIN users u ON u.id = p.userid
    WHERE p.id = ?
    LIMIT 1
  `;
  const res = await queryAsync(sql, [paymentId]);
  return res?.[0] || null;
}


// userlist()

module.exports= {
  getlist,
  profile,
  update,
  getOrder,
  getTransaction,
  getTransactionDetails,
  getLogs,
  updateOrders,
  getFilter,
  fetch_name,
  getOrdersWithFullDetails,
   getOrderFullDetails,
  getPaymentOnlyDetails
}