const {Datastore} = require('@google-cloud/datastore');
const { entity } = require('@google-cloud/datastore/build/src/entity');
const datastore = new Datastore();

module.exports.Datastore = Datastore;
module.exports.datastore = datastore;

const KIND = "project";

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
    if (kind === "project") {
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

        if (kind === "project") {
            q.filter("owner", "=", req.auth.sub);
        } 

        // Set cursor
        if(Object.keys(req.query).includes("cursor")){
            q = q.start(req.query.cursor);
        }

        return datastore.runQuery(q).then( (entities) => {
            results.items = entities[0].map(fromDatastore);

            // Add self link to each projects
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

module.exports.patch_project = function patch_project (patch_body, project_id) {
    return module.exports.get_entity(project_id, "project", "").then( (project) => {
        patched_entity = {};
        patched_entity.owner = project.owner;
        patched_entity.task = project.task;
        if (patch_body.name !== undefined) {
            patched_entity.name = patch_body.name;
        } else {
            patched_entity.name = project.name;
        }

        if (patch_body.type !== undefined) {
            patched_entity.type = patch_body.type;
        } else {
            patched_entity.type = project.type;
        }

        if (patch_body.length !== undefined) {
            patched_entity.length = patch_body.length;
        } else {
            patched_entity.length = project.length;
        }

        const key = datastore.key(["project", parseInt(project_id, 10)]);
    
        return datastore.save({"key": key, "data": patched_entity});
    });
}

module.exports.patch_task = function patch_task (patch_body, task_id) {
    return module.exports.get_entity(task_id, "task", "").then( (task) => {
        patched_entity = {};

        patched_entity.project = task.project;
        if (patch_body.volume !== undefined) {
            patched_entity.volume = patch_body.volume;
        } else {
            patched_entity.volume = task.volume;
        }

        if (patch_body.item !== undefined) {
            patched_entity.item = patch_body.item;
        } else {
            patched_entity.item = task.item;
        }

        if (patch_body.creation_date !== undefined) {
            patched_entity.creation_date = patch_body.creation_date;
        } else {
            patched_entity.creation_date = task.creation_date;
        }

        const key = datastore.key(["task", parseInt(task_id, 10)]);
    
        return datastore.save({"key": key, "data": patched_entity});
    });
}

module.exports.add_task_to_project = function add_task_to_project (project_id, task_id) {
    return module.exports.get_entity(project_id, "project", "").then( (project) => {
        add_task ={};
        add_task.owner = project.owner;
        add_task.name = project.name;
        add_task.type = project.type;
        add_task.length = project.length;
        add_task.task = task_id;

        const key = datastore.key(["project", parseInt(project_id, 10)]);
    
        return datastore.save({"key": key, "data": add_task});
    });
}

module.exports.add_project_to_task = function add_task_to_project (task_id, project_id) {
    return module.exports.get_entity(task_id, "task", "").then( (task) => {
        add_task ={};
        add_task.volume = task.volume;
        add_task.item = task.item;
        add_task.creation_date = task.creation_date;
        add_task.project = project_id;

        const key = datastore.key(["task", parseInt(task_id, 10)]);
    
        return datastore.save({"key": key, "data": add_task});
    });
}

module.exports.remove_task_from_project = function remove_task_from_project (project_id, task_id) {
    return module.exports.get_entity(project_id, "project", "").then( (project) => {
        add_task ={};
        add_task.owner = project.owner;
        add_task.name = project.name;
        add_task.type = project.type;
        add_task.length = project.length;
        add_task.task = null;

        const key = datastore.key(["project", parseInt(project_id, 10)]);
    
        return datastore.save({"key": key, "data": add_task});
    });
}

module.exports.remove_project_from_task = function remove_task_from_project (task_id, project_id) {
    return module.exports.get_entity(task_id, "task", "").then( (task) => {
        add_task ={};
        add_task.volume = task.volume;
        add_task.item = task.item;
        add_task.creation_date = task.creation_date;
        add_task.project = null;

        const key = datastore.key(["task", parseInt(task_id, 10)]);
    
        return datastore.save({"key": key, "data": add_task});
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
