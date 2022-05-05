import Heap from './heap'

export class Position {
    constructor(turn, burns, burnRemaining, pivots, risks, site, engine, previous, freeBurns, direction, engines) {

        this.turn = turn
        this.burns = burns
        this.burnsRemaining = burnRemaining
        this.pivotsRemaining = pivots
        this.risks = risks
        this.site = site
        this.currentEngine = engine
        this.previous = previous
        this.freeBurns = freeBurns
        this.direction = direction
        if (previous == null)
            this.engines = engines
        else
            this.engines = previous.engines
        if (previous)
            this.thrust = previous.thrust
        if (freeBurns > 10) {
            console.log("WARNING  big free burn")
            console.log(this)
        }
    }

    getThrust(spheres, engine) {
        if (engine.solarPowered) {
            return engine.baseThrust + spheres.get(this.site)
        } else
            return engine.baseThrust
    }

    toTupple() {
        return {node: this.site, dir: this.direction, bonus: 0}
    }

    // porównaj turn, burns, burns_remaining, freeBurns, risks, pivotsRemaining
    isNotDominating(position) {
        // if (this.burns - this.currentEngine.burnCost(this.freeBurns +this.pivotsRemaining*2)> position.burns - position.currentEngine.burnCost*(position.freeBurns+2*position.pivotsRemaining))
        // This is not better if position has better potential (which may not be used) than the number of burns we already did
        // if (this.burns > position.burns - position.currentEngine.burnCost * (position.freeBurns + 2 * position.pivotsRemaining))
        if (position.direction !== this.direction)
            return true
        if (this.burns > position.burns)//- position.currentEngine.burnCost * (position.freeBurns + 2 * position.pivotsRemaining))
            return true

        if (this.risks > position.risks)
            return true
        if (this.pivotsRemaining < position.pivotsRemaining) {
            return true
        }
        if (this.burnsRemaining < position.burnsRemaining) {
            return true
        }
        if (this.freeBurns < position.freeBurns) {
            return true
        }
        if (this.turn > position.turn) {
            return true
        }
        return false
    }


    waitTurn(spheres) {
        const changedEngine = []
        for (const activeEngine of this.engines) {
            const thrust = this.getThrust(spheres, activeEngine)
            const nextPosition = new Position(this.turn + 1, this.burns, thrust, activeEngine.pivots, this.risks, this.site, activeEngine, this, 0, null)
            nextPosition.thrust = thrust
            changedEngine.push(nextPosition)
        }
        for (const position of changedEngine) {
            position.tag = "waiting a turn"
        }
        // console.log("Changing engine")
        // console.log(changedEngine)
        return changedEngine
    }

    pEquals(secondPosition) {
        // console.log({dir1: this.direction, dir2: secondPosition.direction, cmp : this.direction !== secondPosition.direction})
        if (this.burns !== secondPosition.burns)
            return false
        if (this.turn !== secondPosition.turn)
            return false
        if (this.pivotsRemaining !== secondPosition.pivotsRemaining)
            return false
        if (this.risks !== secondPosition.risks)
            return false
        if (this.burnsRemaining !== secondPosition.burnsRemaining)
            return false
        if (this.direction !== secondPosition.direction)
            return false
        if (this.site !== secondPosition.site)
            return false
        // console.log("Positions equal")
        return true
        // if (this.burnsRemaining !== secondPosition.burnsRemaining)
        //     return false
    }
}

function checkThrust(position, siteId) {

}


function isPositionBest(position, bestPositionInNode) {
    if (bestPositionInNode != null && bestPositionInNode.length > 0) {
        for (const positionInNode of bestPositionInNode) {
            // If there exist position which is better or equal
            if (!positionInNode.isNotDominating(position) || positionInNode.pEquals(position)) {
                // console.log("Found better")
                // console.log({u:position,v:positionInNode, cmp: positionInNode.isNotDominating(position) ,  eq: positionInNode.pEquals(positionInNode) })
                // if (positionInNode.isBetterThan(position) === 1 || positionInNode.pEquals(position)) {
                // console.log("It is not")
                return false
            }
        }
    }
    // console.log("Didnt find better")
    // console.log({u:position})

    return true

}


function singleBurn(currentPosition, burnTurnRisk, neighbour, spheres) {
    // console.log({burn: burnTurnRisk})

    var reachablePositions = []
    if (currentPosition.freeBurns > 0) {
        const nextPosition = new Position(currentPosition.turn,
            currentPosition.burns,
            currentPosition.burnsRemaining,
            currentPosition.pivotsRemaining,
            currentPosition.risks,
            neighbour.node,
            currentPosition.currentEngine,
            currentPosition,
            currentPosition.freeBurns - 1,
            neighbour.dir)
        nextPosition.tag = "free burn"
        reachablePositions.push(nextPosition)
    } else if (currentPosition.burnsRemaining > 0) {
        //console.log("using remaining burn")

        const nextPosition = new Position(currentPosition.turn,
            currentPosition.burns + currentPosition.currentEngine.burnCost * burnTurnRisk.burns,
            currentPosition.burnsRemaining - 1,
            currentPosition.pivotsRemaining,
            currentPosition.risks,
            neighbour.node,
            currentPosition.currentEngine,
            currentPosition,
            currentPosition.freeBurns,
            neighbour.dir)
        nextPosition.tag = "burn"

        reachablePositions.push(nextPosition)
    }
    reachablePositions = reachablePositions.concat(currentPosition.waitTurn(spheres))

    return reachablePositions

}

function singleTurn(currentPosition, burnTurnRisk, neighbour, spheres) {

    var reachablePositions = []
    //If a turn was made, check if we can make it using pivot
    if (currentPosition.pivotsRemaining > 0) {

        const nextPosition = new Position(currentPosition.turn,
            currentPosition.burns,
            currentPosition.burnsRemaining,
            currentPosition.pivotsRemaining - 1,
            currentPosition.risks,
            neighbour.node,
            currentPosition.currentEngine,
            currentPosition,
            currentPosition.freeBurns,
            neighbour.dir)
        nextPosition.tag = "pivot"

        reachablePositions.push(nextPosition)
        //If a turn was made, check if we can make it using 2 burns
    } else if (currentPosition.burnsRemaining > 1) {
        const nextPosition = new Position(currentPosition.turn,
            currentPosition.burns + currentPosition.currentEngine.burnCost * 2,
            currentPosition.burnsRemaining - 2,
            currentPosition.pivotsRemaining,
            currentPosition.risks,
            neighbour.node,
            currentPosition.currentEngine,
            currentPosition,
            currentPosition.freeBurns,
            neighbour.dir)
        nextPosition.tag = "forced turn"

        reachablePositions.push(nextPosition)
    }
    //If no pivots are possible, wait a year AND do try to turn by burning
    if (currentPosition.pivotsRemaining === 0) {
        reachablePositions = reachablePositions.concat(currentPosition.waitTurn(spheres))
    }
    return reachablePositions
}

function reachablePositions(currentPosition, burnTurnRiskArray, neighbour, spheres) {
    // if (neighbour.bonus !== 0)
    //     console.log(neighbour)
    const burnTurnRisk = {burns: burnTurnRiskArray[0], turns: burnTurnRiskArray[1], risks: burnTurnRiskArray[2]}
    // console.log(burnTurnRisk)
    let reachablePositions = []
    if (burnTurnRisk.burns > 0) {
        const burnPositions = singleBurn(currentPosition, burnTurnRisk, neighbour, spheres)
        reachablePositions = reachablePositions.concat(burnPositions)
    } else if (burnTurnRisk.turns === 1) {
        reachablePositions = reachablePositions.concat(singleTurn(currentPosition, burnTurnRisk, neighbour, spheres))
    } else {
        // Nothing happened, cruising through lagrange point or sth, chilling in my spacecraft while being oblivious to the dangers od space travel
        const nextPosition = new Position(currentPosition.turn,
            currentPosition.burns,
            currentPosition.burnsRemaining,
            currentPosition.pivotsRemaining,
            currentPosition.risks,
            neighbour.node,
            currentPosition.currentEngine,
            currentPosition,
            currentPosition.freeBurns + neighbour.bonus,
            neighbour.dir)
        nextPosition.tag = "crusing"
        reachablePositions.push(nextPosition)
    }
    return reachablePositions
}


export function dijkstra(getNeighbors, burnTurnRiskExtractor, source, allowed, engines, spheres) {
    console.log(engines)
    let iteration = 0
    const bestFound = new Map()
    const prequelPosition = new Position(0, 0, 0, 0, 0, source.node, null, null, 0, null, engines)
    const startingPositions = prequelPosition.waitTurn(spheres)
    bestFound.set(source.node, startingPositions)
    const positionsQueue = startingPositions


    while (positionsQueue.length > 0) {
        iteration = iteration + 1
        if (iteration % 100000 === 0) {
            console.log("Iteration:")
            console.log(iteration)
            console.log("size")
            console.log(positionsQueue.length)
        }
        if (iteration === 100)
            break

        const currentPosition = positionsQueue.shift()

        const idCurrentPosition = currentPosition.site

        if (!bestFound.has(idCurrentPosition)) {
            bestFound.set(idCurrentPosition, [])
        }

        const neighbours = getNeighbors(currentPosition.toTupple())
        for (const neighbour of neighbours) {
            if (!bestFound.has(neighbour.node)) {
                bestFound.set(neighbour.node, [])
            }
            const burnTurnRisk = burnTurnRiskExtractor(currentPosition.toTupple(), neighbour)

            const nextPositions = reachablePositions(currentPosition, burnTurnRisk, neighbour, spheres)

            for (const nextPosition of nextPositions) {
                if (!allowed(currentPosition, nextPosition)) {
                    continue
                }
                if(nextPosition.burns>50){
                    continue
                }
                const idNeighbour = nextPosition.site
                if (isPositionBest(nextPosition, bestFound.get(idNeighbour))) {
                    const bestInSite = bestFound.get(idNeighbour)
                    bestFound.set(idNeighbour, bestInSite.filter(x => {
                        return (x.isNotDominating(nextPosition))
                    }))
                    bestFound.get(idNeighbour).push(nextPosition)
                    const xxx = bestFound.get(idNeighbour).sort(function (a, b) {
                        return a.burns - b.burns
                    })
                    bestFound.set(idNeighbour, xxx)
                    // console.log(xxx)
                    positionsQueue.push(nextPosition)
                }

            }
            positionsQueue.sort(function (a, b) {
                return a.burns < b.burns
            })
        }
    }
    console.log({bestFound: bestFound})
    return bestFound
}
