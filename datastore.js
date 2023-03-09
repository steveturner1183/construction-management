const {Datastore} = require('@google-cloud/datastore');
const { entity } = require('@google-cloud/datastore/build/src/entity');
const datastore = new Datastore();

module.exports.Datastore = Datastore;
module.exports.datastore = datastore;

const KIND = "boat";

/* ------------- Model Functions ------------- */

function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item;
}

/**
 * Add an entity
 * @param {*} new_entity JSON contianing entity attributes
 * @param {*} kind Kind entity is to belong to
 * @returns New entity with new id
 */
 module.exports.post_entity = function post_entity(new_entity, kind) {
    var key = datastore.key(kind);

    return datastore.save({ "key": key, "data": new_entity})
        .then(() => {
            // Add id attribute to entity
            new_entity.id = key.id;
            return new_entity;
        });
}

/**
 * Searches for entity with matching identifier
 * @param {*} given_ident identifier provided
 * @param {*} target_ident target identifier attribute in datastore
 * @param {*} kind kind to search in datastore
 * @returns True if entity exists, false otherwise
 */
 module.exports.entity_exists = function entity_exists(given_ident, target_ident, kind) {
    const q = datastore.createQuery(kind)
    .filter(target_ident, "=", given_ident);

    return datastore.runQuery(q)
    .then ( (query) => {
        if (query[0][0] == undefined) {
            return false;
        } else {
            return true;
        }
    });
}


/**
 * 
 * @param {*} kind 
 * @returns 
 */
module.exports.get_all_entities = function get_all_entities(kind) {
    const q = datastore.createQuery(kind)

    return datastore.runQuery(q)
    .then ( (query) => {
        if (query === null || query === undefined) {
            return [];
        } else {
            return query[0].map(fromDatastore);
        }
    });
}


/**
 * Get all enitites in Datastore for given kind
 * Only 5 entities given at a time
 * @param {*} kind Kind name
 * @param {*} req request
 * @returns All entitiess in for given kind Datastore
 */
 module.exports.get_all_entities_pag = function get_all_entities_pag(req, kind) {
    if (kind === "Boat") {
        var count_q = datastore.createQuery(kind)
        .filter("owner", "=", req.auth.sub);
    } else {
        var count_q = datastore.createQuery(kind);
    }
    
    let results = {};
    return datastore.runQuery(count_q)
    .then( (all_entities) => {
        let total_count = all_entities[0].length;
        results.total_count = total_count;

        var q = datastore.createQuery(kind)
        .limit(5);

        if (kind === "Boat") {
            q.filter("owner", "=", req.auth.sub);
        } 

        // Set cursor
        if(Object.keys(req.query).includes("cursor")){
            q = q.start(req.query.cursor);
        }

        return datastore.runQuery(q).then( (entities) => {
            results.items = entities[0].map(fromDatastore);

            // Add self link to each boats
            for (let i=0; i<results.items.length; i++) {
                results.items[i].self = req.protocol + "://" + req.get("host") + req.baseUrl + "/" + results.items[i].id;
            };

            if(entities[1].moreResults !== datastore.NO_MORE_RESULTS ) {
                results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + entities[1].endCursor;
            }
            return results;
        });
    });
}

/**
 * Returns a single entity from Datastore for given kind
 * @param {*} id Entity id
 * @param {*} kind Kind name
 * @returns undefined or null if entity id DNE, entity attributes and id otherwise
 */
 module.exports.get_entity = function get_entity(entity_id, kind, url) {
    const key = datastore.key([kind, parseInt(entity_id, 10)]);

    return datastore.get(key).then((entity) => {
        if (entity[0] === undefined || entity[0] === null) {

            // No entity found
            return entity[0];

        } else {
            
            // Add id attribute to entity
            entity[0].id = entity[0][Datastore.KEY].id;
            // Add link to entity
            entity[0].self = url + entity[0].id;
            
            return entity[0];
            
        }
    });
}

/**
 * Patches a given entity
 * @param {*} id entity id
 * @param {*} entity object representing what data entity 
 *                   is to be replaced with
 * @param {*} kind kind entity belongs to
 * @returns Datastore object
 */
 module.exports.put_entity = function put_entity(id, req, kind) {
    const key = datastore.key([kind, parseInt(id, 10)]);
    return datastore.save({"key": key, "data": req.body});
}

module.exports.patch_boat = function patch_boat (patch_body, boat_id) {
    return module.exports.get_entity(boat_id, "Boat", "").then( (boat) => {
        patched_entity = {};
        patched_entity.owner = boat.owner;
        patched_entity.load = boat.load;
        if (patch_body.name !== undefined) {
            patched_entity.name = patch_body.name;
        } else {
            patched_entity.name = boat.name;
        }

        if (patch_body.type !== undefined) {
            patched_entity.type = patch_body.type;
        } else {
            patched_entity.type = boat.type;
        }

        if (patch_body.length !== undefined) {
            patched_entity.length = patch_body.length;
        } else {
            patched_entity.length = boat.length;
        }

        const key = datastore.key(["Boat", parseInt(boat_id, 10)]);
    
        return datastore.save({"key": key, "data": patched_entity});
    });
}

module.exports.patch_load = function patch_load (patch_body, load_id) {
    return module.exports.get_entity(load_id, "Load", "").then( (load) => {
        patched_entity = {};

        patched_entity.boat = load.boat;
        if (patch_body.volume !== undefined) {
            patched_entity.volume = patch_body.volume;
        } else {
            patched_entity.volume = load.volume;
        }

        if (patch_body.item !== undefined) {
            patched_entity.item = patch_body.item;
        } else {
            patched_entity.item = load.item;
        }

        if (patch_body.creation_date !== undefined) {
            patched_entity.creation_date = patch_body.creation_date;
        } else {
            patched_entity.creation_date = load.creation_date;
        }

        const key = datastore.key(["Load", parseInt(load_id, 10)]);
    
        return datastore.save({"key": key, "data": patched_entity});
    });
}

module.exports.add_load_to_boat = function add_load_to_boat (boat_id, load_id) {
    return module.exports.get_entity(boat_id, "Boat", "").then( (boat) => {
        add_load ={};
        add_load.owner = boat.owner;
        add_load.name = boat.name;
        add_load.type = boat.type;
        add_load.length = boat.length;
        add_load.load = load_id;

        const key = datastore.key(["Boat", parseInt(boat_id, 10)]);
    
        return datastore.save({"key": key, "data": add_load});
    });
}

module.exports.add_boat_to_load = function add_load_to_boat (load_id, boat_id) {
    return module.exports.get_entity(load_id, "Load", "").then( (load) => {
        add_load ={};
        add_load.volume = load.volume;
        add_load.item = load.item;
        add_load.creation_date = load.creation_date;
        add_load.boat = boat_id;

        const key = datastore.key(["Load", parseInt(load_id, 10)]);
    
        return datastore.save({"key": key, "data": add_load});
    });
}

module.exports.remove_load_from_boat = function remove_load_from_boat (boat_id, load_id) {
    return module.exports.get_entity(boat_id, "Boat", "").then( (boat) => {
        add_load ={};
        add_load.owner = boat.owner;
        add_load.name = boat.name;
        add_load.type = boat.type;
        add_load.length = boat.length;
        add_load.load = null;

        const key = datastore.key(["Boat", parseInt(boat_id, 10)]);
    
        return datastore.save({"key": key, "data": add_load});
    });
}

module.exports.remove_boat_from_load = function remove_load_from_boat (load_id, boat_id) {
    return module.exports.get_entity(load_id, "Load", "").then( (load) => {
        add_load ={};
        add_load.volume = load.volume;
        add_load.item = load.item;
        add_load.creation_date = load.creation_date;
        add_load.boat = null;

        const key = datastore.key(["Load", parseInt(load_id, 10)]);
    
        return datastore.save({"key": key, "data": add_load});
    });
}

/****************************************************** */

/**
 * Deletes a given entity
 * @param {*} id entity id
 * @param {*} kind kind entity belongs to
 * @returns 
 */
 module.exports.delete_entity = function delete_entity(id, kind) {
    const key = datastore.key([kind, parseInt(id, 10)]);
    return datastore.delete(key);
}
