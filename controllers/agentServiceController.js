const {
    
getAgentByProvider,
getAgentServices,
checkServiceExists,
checkAgentServiceExists,
addAgentService,
removeAgentService

} = require("../models/agentServiceModel");


// Get all services of an agent

const getServicesByAgent = async (
req,
res
) => {

try {

const { agent_id } = req.params;

const provider_id = req.user.id;


// Check agent belongs to logged-in provider

const agent = await getAgentByProvider(
    agent_id,
    provider_id
);


if (!agent) {

    return res.status(404).json({

        success: false,

        message: "Agent not found"

    });

}


const services = await getAgentServices(
    agent_id
);


return res.status(200).json({

    success: true,

    services

});


} catch (error) {

return res.status(500).json({

    success: false,

    message: error.message

});

}

};



// Assign service to agent

const assignServiceToAgent = async (
req,
res
) => {

try {

const { agent_id } = req.params;

const { service_id } = req.body;

const provider_id = req.user.id;


if (!service_id) {

    return res.status(400).json({

        success: false,

        message: "Service id is required"

    });

}


// Check agent belongs to provider

const agent = await getAgentByProvider(
    agent_id,
    provider_id
);


if (!agent) {

    return res.status(404).json({

        success: false,

        message: "Agent not found"

    });

}


// Check service exists

const service = await checkServiceExists(
    service_id
);


if (!service) {

    return res.status(404).json({

        success: false,

        message: "Service not found"

    });

}


// Check duplicate assignment

const existingService =
    await checkAgentServiceExists(
        agent_id,
        service_id
    );


if (existingService) {

    return res.status(409).json({

        success: false,

        message:
            "This service is already assigned to the agent"

    });

}


const agentService =
    await addAgentService(
        agent_id,
        service_id
    );


return res.status(201).json({

    success: true,

    message:
        "Service assigned to agent successfully",

    agentService

});


} catch (error) {

return res.status(500).json({

    success: false,

    message: error.message

});

}

};



// Remove service from agent

const removeServiceFromAgent = async (
req,
res
) => {

try {

const { agent_id, service_id } =
    req.params;

const provider_id = req.user.id;


// Check agent belongs to provider

const agent = await getAgentByProvider(
    agent_id,
    provider_id
);


if (!agent) {

    return res.status(404).json({

        success: false,

        message: "Agent not found"

    });

}


const removedService =
    await removeAgentService(
        agent_id,
        service_id
    );


if (!removedService) {

    return res.status(404).json({

        success: false,

        message:
            "Service assignment not found"

    });

}


return res.status(200).json({

    success: true,

    message:
        "Service removed from agent successfully",

    removedService

});


} catch (error) {

return res.status(500).json({

    success: false,

    message: error.message

});

}

};


module.exports = {
getServicesByAgent,
assignServiceToAgent,
removeServiceFromAgent

};