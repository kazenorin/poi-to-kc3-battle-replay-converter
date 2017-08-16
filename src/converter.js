import _ from "lodash";
import * as PoiFleets from "./constants/poi-fleets";

const defaultSortieId = 1;
const defaultBattleId = 10000;

export default function (poiDataList) {
    const escortFleet = getFleet(poiDataList, PoiFleets.escort);
    return {
        "id": defaultSortieId,
        "world": getWorld(poiDataList),
        "mapnum": getMap(poiDataList),
        "fleetnum": 1,
        "combined": escortFleet && escortFleet.length ? 1 : 0,
        "fleet1": getFleet(poiDataList, PoiFleets.main),
        "fleet2": escortFleet,
        "fleet3": getFleet(poiDataList, PoiFleets.support),
        "fleet4": getFleet(poiDataList, PoiFleets.support, true),
        "support1": checkHasNodeSupport(poiDataList),
        "support2": checkHasBossSupport(poiDataList),
        "lbas": getLbas(poiDataList),
        "time": getSortieTime(poiDataList),
        "battles": getBattles(poiDataList)
    }

};

function getWorld(poiDataList) {
    return _.get(poiDataList[0], ["map", 0]);
}

function getMap(poiDataList) {
    return _.get(poiDataList[0], ["map", 1]);
}

function getSortieTime(poiDataList) {
    return parseInt((poiDataList[0].time ? poiDataList[0].time : Date.now()) / 1000);
}

function getFleet(poiDataList, poiFleetKey, isBossSupport) {
    const poiData = isBossSupport === true ? _.last(poiDataList) : poiDataList[0];
    return convertFleet(_.get(poiData, ["fleet", poiFleetKey]));
}

function convertFleet(poiFleetData) {

    return poiFleetData ? _.map(_.compact(poiFleetData), function (poiShip) {

        const output = {
            "mst_id": poiShip.api_ship_id,
            "level": poiShip.api_lv,
            "kyouka": poiShip.api_kyouka,
            "morale": poiShip.api_cond,
            "equip": [],
            "stars": [],
            "ace": []
        };

        const allEquip = poiShip.poi_slot ? _.compact(poiShip.poi_slot) : [];
        poiShip.poi_slot_ex && allEquip.push(poiShip.poi_slot_ex);
        _.forEach(allEquip, equipment => {
            output.equip.push(equipment.api_slotitem_id);
            output.stars.push(equipment.api_level);
            output.ace.push(equipment.api_alv);
        });

        return output;
    }) : [];
}

function getLbas(poiDataList) {
    const poiLbac = _.get(poiDataList, [0, "fleet", "LBAC"]);
    return poiLbac ? _.compact(_.map(poiLbac, lbac => lbac && {
        "rid": lbac.api_rid,
        "range": lbac.api_distance,
        "action": lbac.api_action_kind,
        "planes": _.map(lbac.api_plane_info, poiPlaneInfo => poiPlaneInfo && {
            "mst_id": _.get(poiPlaneInfo, ["poi_slot", "api_slotitem_id"]),
            "count": _.get(poiPlaneInfo, "api_count"),
            "stars": _.get(poiPlaneInfo, ["poi_slot", "api_level"]),
            "ace": _.get(poiPlaneInfo, ["poi_slot", "api_alv"]),
            "state": _.get(poiPlaneInfo, "api_state"),
            "morale": _.get(poiPlaneInfo, "api_cond")
        })
    })) : []
}

function checkHasNodeSupport(poiDataList) {
    return _.some(_.initial(poiDataList), fleetData => _.get(fleetData, ["fleet", "support"])) ? 1 : 0;
}

function checkHasBossSupport(poiDataList) {
    return _.get(_.last(poiDataList), ["fleet", "support"]) != null ? 1 : 0;
}

function getBattles(poiDataList) {
    return _.map(poiDataList, function (poiData, i) {
        const battleResult = _.last(poiData.packet);

        return {
            "sortie_id": defaultSortieId,                                   // Not mappable, corresponds to KC3K's combat data top level id
            "node": _.get(poiData, ["map", 2]),
            "data": _.get(poiData, ["packet", 0]),
            "yasen": poiData.packet.length > 2 ? _.get(poiData, ["packet", 1]) : {}, // Conditional - if 'packet.length > 2', and has key 'api_deck_id', also 'poi_path' === "/kcsapi/api_req_battle_midnight/battle",
            "rating": battleResult.api_win_rank,
            "drop": _.get(battleResult, ["api_get_ship", "api_ship_id"]),
            "time": _.get(battleResult, "poi_time", Date.now()) / 1000,
            "baseEXP": battleResult.api_get_base_exp,
            "hqEXP": battleResult.api_get_exp,
            "mvp": [battleResult.api_mvp],
            "id": defaultBattleId + i                                                 // Not mappable, unique ID for this battle by KC3K
        }
    });
}




