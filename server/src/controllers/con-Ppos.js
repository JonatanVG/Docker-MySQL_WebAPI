import mod from "../model/mod-p-pos.js";

const pos_get = async (req, res) => {
  const data = await mod.fetchData(req, res, 'SELECT * FROM PHONE_GPS_TRACKER WHERE ID =?;' );
  return data;
};

const tour_get = async (req, res) => {
  const data = await mod.fetchData(req, res, 'SELECT * FROM PHONE_GPS_TRACKER WHERE TOURID = ?;' );
  return data;
};

const all_get = async (req, res) => {
  const data = await mod.fetchData(req, res, 'SELECT * FROM PHONE_GPS_TRACKER;' );
  return data;
};

const post_pos = async (req, res) => {
  const data = await mod.postData(req, res);
  return data;
}

export default {
  pos_get,
  tour_get,
  all_get,
  post_pos
};