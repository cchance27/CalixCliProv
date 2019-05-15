const Q = require('q')
const unirest = require('unirest');
const xml2js = require('xml2js');
const parser = xml2js.Parser();

var ourSession = 0
const url = 'http://172.16.3.254:18080/cmsexc/ex/netconf'
const authreply = "auth-reply"
const args = process.argv.splice(process.execArgv.length + 2);

const xmlLogin = function () {
    return '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">' + '\n' +
        '<soapenv:Body><auth message-id="1"><login>' + '\n' +
        '<UserName>rootgod</UserName><Password>root</Password>' + '\n' +
        '</login></auth></soapenv:Body></soapenv:Envelope>'
}

const xmlLogout = function (session) {
    return '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">' + '\n' +
        '<soapenv:Body><auth message-id="5"><logout>' + '\n' +
        '<UserName>rootgod</UserName><SessionId>' + session + '</SessionId>' + '\n' +
        '</logout></auth></soapenv:Body></soapenv:Envelope>'
}

const xmlCREATEONT = function (node, session, serial) {
    return '<soapenv:Envelope xmlns:soapenv="http://www.w3.org/2003/05/soap-envelope"><soapenv:Body>' + '\n' +
        '<rpc message-id="2" nodename="' + node + '" timeout="35000" username="rootgod" sessionid="' + session + '">' + '\n' +
        '<edit-config><target><running/></target><config><top><object operation="create" get-config="true">' + '\n' +
        '<type>Ont</type><id><ont>0</ont></id><admin>enabled</admin>' + '\n' +
        '<serno>' + serial + '</serno>' + '\n' +
        '<reg-id></reg-id><subscr-id></subscr-id><descr></descr><ontprof><type>OntProf</type><id>' + '\n' +
        '<ontprof>157</ontprof>' + '\n' +
        '</id></ontprof></object></top></config></edit-config></rpc></soapenv:Body></soapenv:Envelope>'
}

const xmlGETONT = function (node, session, serial) {
    return '<soapenv:Envelope xmlns:soapenv="www.w3.org/2003/05/soap-envelope"><soapenv:Body>' + '\n' +
        '<rpc message-id="2" nodename="' + node + '" username="rootgod" sessionid="' + session + '">' + '\n' +
        '<action><action-type>show-ont</action-type><action-args><serno>' + serial + '</serno></action-args></action></rpc></soapenv:Body></soapenv:Envelope>'
}


const xmlGETPROF = function (node, session, ont) {
    return `<soapenv:Envelope xmlns:soapenv="www.w3.org/2003/05/soap-envelope"><soapenv:Body>
         <rpc message-id="3" nodename="${node}" username="rootgod" sessionid="${session}">
             <get-config>
                 <source>
                     <running/>
                 </source>
                 <filter type="subtree">
                     <top>
                         <object>
                             <type>Ont</type>
                             <id><ont>${ont}</ont></id>
                                 <children>
                                     <type>OntRg</type>
                                     <attr-list>pppoe-user pppoe-password</attr-list>
                                 </children>
                         </object>
                     </top>
                 </filter>
             </get-config>
         </rpc>
     </soapenv:Body>
    </soapenv:Envelope>`
}


const xmlPROVDS = function (node, session, ont) {
    return '<soapenv:Envelope xmlns:soapenv="http://www.w3.org/2003/05/soap-envelope">' + '\n' +
        '<soapenv:Body><rpc message-id="3" nodename="' + node + '" timeout="35000" username="rootgod" sessionid="' + session + '">' + '\n' +
        '<edit-config><target><running/></target><config><top><object operation="create" get-config="true"><type>EthSvc</type><id>' + '\n' +
        '<ont>' + ont + '</ont>' + '\n' +
        '<ontslot>8</ontslot><ontethany>1</ontethany><ethsvc>1</ethsvc></id><admin>enabled</admin>' + '\n' +
        '<tag-action><type>SvcTagAction</type><id><svctagaction>2</svctagaction></id></tag-action>' + '\n' +
        '<bw-prof><type>BwProf</type><id><bwprof>1</bwprof></id></bw-prof>' + '\n' +
        '</object></top></config></edit-config></rpc></soapenv:Body></soapenv:Envelope>'
}

const xmlPPPOE = function (node, session, ont, user, pass) {
    return '<soapenv:Envelope xmlns:soapenv="http://www.w3.org/2003/05/soap-envelope">' + '\n' +
        '<soapenv:Body><rpc message-id="4" nodename="' + node + '" timeout="35000" username="rootgod" sessionid="' + session + '">' + '\n' +
        '<edit-config><target><running/></target><config><top><object operation="merge"><type>OntRg</type><id>' + '\n' +
        '<ont>' + ont + '</ont>' + '\n' +
        '<ontslot>8</ontslot><ontrg>1</ontrg></id><admin>enabled</admin><mgmt-mode>native</mgmt-mode><wan-protocol>pppoe</wan-protocol>' + '\n' +
        '<pppoe-user>' + user + '</pppoe-user><pppoe-password>' + pass + '</pppoe-password>' + '\n' +
        '</object></top></config></edit-config></rpc></soapenv:Body></soapenv:Envelope>'
}

function restLOGIN(XML) {
    var deferred = Q.defer()
    unirest.post(url).headers({
        'Content-Type': 'application/json;charset=UTF-8'
    }).send(XML).end(function (response) {
        let str = response.body.replace(/:/g, '').replace(/-/g, '')
        parser.parseString(str, function (err, result) {
            if (result.Envelope.Body[0].authreply[0].ResultCode[0] == '0') {
                deferred.resolve(result.Envelope.Body[0].authreply[0].SessionId[0])
            } else {
                deferred.reject(result.Envelope.Body[0].authreply[0].ResultCode[0])
            }
        })
    })
    return deferred.promise
}

function restLOGOUT(XML) {
    var deferred = Q.defer()
    unirest.post(url).headers({
        'Content-Type': 'application/json;charset=UTF-8'
    }).send(XML).end(function (response) {
        let str = response.body.replace(/:/g, '').replace(/-/g, '')
        parser.parseString(str, function (err, result) {
            if (result.Envelope.Body[0].authreply[0].ResultCode[0] == '0') {
                deferred.resolve(result.Envelope.Body[0].authreply[0].SessionId[0])
            } else {
                deferred.reject(result.Envelope.Body[0].authreply[0].ResultCode[0])
            }
        })
    })
    return deferred.promise
}

function restCREATE(XML) {
    var deferred = Q.defer()
    unirest.post(url).headers({
        'Content-Type': 'application/json;charset=UTF-8'
    }).send(XML).end(function (response) {
        let str = response.body.replace(/soapenv:/gi, '').replace(/-/gi, '')
        parser.parseString(str, function (err, result) {
            // console.log(JSON.stringify(result, null, 2))
            if (result.Envelope.Body[0].rpcreply[0].rpcerror !== undefined) {
                deferred.reject(result.Envelope.Body[0].rpcreply[0].rpcerror[0].errormessage[0]._)
            } else {
                deferred.resolve(JSON.stringify(result.Envelope.Body[0].rpcreply[0].data[0].top[0].object[0].id[0].ont[0]))
            }
        })
    })
    return deferred.promise
}

function restGET(XML, consolelog) {
    var deferred = Q.defer()
    unirest.post(url).headers({
        'Content-Type': 'application/json;charset=UTF-8'
    }).send(XML).end(function (response) {
        let str = response.body.replace(/soapenv:/gi, '').replace(/-/gi, '')
        parser.parseString(str, function (err, result) {
            //console.log(JSON.stringify(result, null, 2))
            if (result.Envelope.Body[0].rpcreply[0].rpcerror !== undefined) {
                deferred.reject(result.Envelope.Body[0].rpcreply[0].rpcerror[0].errormessage[0]._)
            } else {
                if (consolelog === true) {
                console.log()
                console.log('  ONT ID: ' + result.Envelope.Body[0].rpcreply[0].actionreply[0].match[0].get[0].object[0].id[0].ont[0])
                console.log('  Unit Status: ' + result.Envelope.Body[0].rpcreply[0].actionreply[0].match[0].get[0].object[0].opstat[0])
                console.log('  SW Version: ' + result.Envelope.Body[0].rpcreply[0].actionreply[0].match[0].get[0].object[0].currswvers[0])
                console.log('  Uptime: ' + result.Envelope.Body[0].rpcreply[0].actionreply[0].match[0].get[0].object[0].uptime[0])
                console.log('  ONU Signal: -' + result.Envelope.Body[0].rpcreply[0].actionreply[0].match[0].get[0].object[0].optsiglvl[0])
                console.log('  OLT Signal: -' + result.Envelope.Body[0].rpcreply[0].actionreply[0].match[0].get[0].object[0].feoptlvl[0])
                console.log('  Range: ' + result.Envelope.Body[0].rpcreply[0].actionreply[0].match[0].get[0].object[0].rangelength[0] + ' meters')
                }
                deferred.resolve(result.Envelope.Body[0].rpcreply[0].actionreply[0].match[0].get[0].object[0].id[0].ont[0])
            }
        })
    })
    return deferred.promise
}

function restGETPROF(node, session, ont, consolelog) {
    var deferred = Q.defer()
    unirest.post(url).headers({
        'Content-Type': 'application/json;charset=UTF-8'
    }).send(xmlGETPROF(node, session, ont)).end(function (response) {
        let str = response.body.replace(/soapenv:/gi, '').replace(/-/gi, '')
        //console.log(xmlGETPROF(node, session, ont))
        parser.parseString(str, function (err, result) {
          //  console.log(JSON.stringify(result, null, 2))
            if (result.Envelope.Body[0].rpcreply[0].rpcerror !== undefined) {
                deferred.reject(result.Envelope.Body[0].rpcreply[0].rpcerror[0].errormessage[0]._)
            } else {
                flat = JSON.flatten(result)
                if (consolelog === true) {
                console.log("   PPPoE Username: " + flat["Envelope.Body.0.rpcreply.0.data.0.top.0.object.0.children.0.child.0.pppoeuser.0"])
                } else {
                    console.log(flat["Envelope.Body.0.rpcreply.0.data.0.top.0.object.0.children.0.child.0.pppoeuser.0"])
                }
                deferred.resolve(flat["Envelope.Body.0.rpcreply.0.data.0.top.0.object.0.id.0.ont.0"])
            }
        })
    })
    return deferred.promise
}
JSON.flatten = function(data) {
    var result = {};
    function recurse (cur, prop) {
        if (Object(cur) !== cur) {
            result[prop] = cur;
        } else if (Array.isArray(cur)) {
             for(var i=0, l=cur.length; i<l; i++)
                 recurse(cur[i], prop ? prop+"."+i : ""+i);
            if (l == 0)
                result[prop] = [];
        } else {
            var isEmpty = true;
            for (var p in cur) {
                isEmpty = false;
                recurse(cur[p], prop ? prop+"."+p : p);
            }
            if (isEmpty)
                result[prop] = {};
        }
    }
    recurse(data, "");
    return result;
}
function restPROVDS(XML) {
    var deferred = Q.defer()
    unirest.post(url).headers({
        'Content-Type': 'application/json;charset=UTF-8'
    }).send(XML).end(function (response) {
        let str = response.body.replace(/soapenv:/gi, '').replace(/-/gi, '')
        parser.parseString(str, function (err, result) {
            if (result.Envelope.Body[0].rpcreply[0].rpcerror !== undefined) {
                deferred.reject(result.Envelope.Body[0].rpcreply[0].rpcerror[0].errormessage[0]._)
            } else {
                deferred.resolve(JSON.stringify(result.Envelope.Body[0].rpcreply[0].data[0].top[0].object[0].id[0].ont[0]))
            }
        })
    })
    return deferred.promise
}

function restPPPOE(XML) {
    var deferred = Q.defer()
    unirest.post(url).headers({
        'Content-Type': 'application/json;charset=UTF-8'
    }).send(XML).end(function (response) {
        let str = response.body.replace(/soapenv:/gi, '').replace(/-/gi, '')
        parser.parseString(str, function (err, result) {
            if (result.Envelope.Body[0].rpcreply[0].rpcerror !== undefined) {
                deferred.reject(result.Envelope.Body[0].rpcreply[0].rpcerror[0].errormessage[0]._)
            } else {
                deferred.resolve(true)
            }
        })
    })
    return deferred.promise
}

//examples
let confNode = 'NTWK-CUPECOY-GPON1'
let confSerial = '111112'
let confUsername = 'butthead'
let confPassword = '12345678'

if (args.length == 2) {
    console.log('Getting ONT: ' + args[1])
    confNode = args[0]
    confSerial = args[1]
    startGet()
}

if (args.length == 4) {
    console.log('Creating ONT: ' + args[1])
    confNode = args[0]
    confSerial = args[1]
    confUsername = args[2]
    confPassword = args[3]
    startCreate()
}

if (args.length == 3) { //Just Print
    if (args[2] == "pppoe") {
    confNode = args[0]
    confSerial = args[1]
    startPPPOE()
    } else { "Unknown Extra Command" }
}

if (args.length != 4 && args.length !=  2 && args.length != 3) {
    console.log('Options missing, "CREATE: node calix NODENAME SERIAL USERNAME PASSWORD"')
    console.log('Options missing, "SEARCH: node calix NODENAME SERIAL"')
}

function startGet() {
    let xml = xmlLogin()
    restLOGIN(xml).then(getONT).catch(function (e) {
        console.log('GET Login Error:', e)
    })
}

function startPPPOE() {
    let xml = xmlLogin()
    restLOGIN(xml).then(getPPPoE).catch(function (e) {
        console.log('GET Login Error:', e)
    })
}

function startCreate() {
    let xml = xmlLogin()
    restLOGIN(xml).then(createONT).catch(function (e) {
        console.log('CREATE Login Error:', e)
    })
}

function getONT(session) {
    console.log('Login Session:', session)
    oursession = session
    let xml = xmlGETONT(confNode, oursession, confSerial)
    restGET(xml, true).then((ont) => restGETPROF(confNode, oursession, ont, true)).then(logout).catch(function (e) {
        console.log('Get Error:', e)
    })
}

function getPPPoE(session) {
    oursession = session
    let xml = xmlGETONT(confNode, oursession, confSerial)
    restGET(xml, false).then((ont) => restGETPROF(confNode, oursession, ont, false)).then(logout).catch(function (e) {
        console.log('Get Error:', e)
    })
}

function createONT(session) {
    console.log('Login Session:', session)
    oursession = session
    let xml = xmlCREATEONT(confNode, oursession, confSerial)
    //console.log(xml)
    restCREATE(xml).then(processONT).catch(function (e) {
        console.log('Create Error:', e)
    })
}

function processONT(ontid) {
    ontid = ontid.replace(/\"/gi, '')
    console.log('ONT Created', ontid, oursession)
    let xml = xmlPROVDS(confNode, oursession, ontid)
    // console.log(xml)
    restPROVDS(xml).then(setPPPOE).catch(function (e) {
        console.log('Prov Error:', e)
    })
}

function setPPPOE(ontid) {
    ontid = ontid.replace(/\"/gi, '')
    console.log('DATA Provisioned', ontid, oursession)
    let xml = xmlPPPOE(confNode, oursession, ontid, confUsername, confPassword)
    //console.log(xml)
    restPPPOE(xml).then(function (res) {
        console.log('Provisioned PPPoE')
        logout()
    }).catch(function (e) {
        console.log('PPPoE Error:', e)
        logout()
    })
}

function logout() {
    let xml = xmlLogout(oursession)
    restLOGOUT(xml).then(function (d) {
//        console.log('Session Logout:', d)
    }).catch(function (e) {
        console.log('Logout Error:', e)
    })
}