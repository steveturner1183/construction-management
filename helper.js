module.exports.get_url = function get_url(req) {
    return req.protocol + "://" + req.get("host") + req.baseUrl;
}

module.exports.add_id_and_self = function add_id_and_self(req, id) {
    let payload = Object.assign({"id": id}, req.body);
    payload.self = module.exports.get_url(req) + "/" + id;
    return payload;
}