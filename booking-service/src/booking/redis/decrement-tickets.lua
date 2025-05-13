-- KEYS[1]: seatTypeId (the Redis key storing remainingTickets)
-- ARGV[1]: quantity (the number of tickets the user wants to book)

local seatTypeId = KEYS[1]
local quantity = tonumber(ARGV[1]) 

-- Check if the quantity is valid (quantity should be greater than 0 and not nil)
if quantity == nil or quantity <= 0 then
  return -2 -- Error: invalid quantity
end

-- Retrieve the remaining tickets from Redis
local remainingTickets = redis.call('GET', seatTypeId)

-- Check if the key (seatTypeId) does not exist in Redis
if remainingTickets == false then
  return -3 -- Error: key does not exist
end

-- Convert the remaining tickets to a number
remainingTickets = tonumber(remainingTickets)

-- Check if there are enough tickets available
if remainingTickets >= quantity then
  local newRemainingTickets = redis.call('DECRBY', seatTypeId, quantity)

  if newRemainingTickets < 0 then
    redis.call('INCRBY', seatTypeId, quantity) -- rollback 
    return -4 -- Error: negative value after decrement
  end

  return newRemainingTickets -- Success: return the remaining tickets
else
  return -1 -- Error: not enough tickets
end
