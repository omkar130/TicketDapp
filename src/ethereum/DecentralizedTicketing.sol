// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DecentralizedTicketing is ERC721Enumerable, Ownable {
    // Using plain variables instead of Counters
    uint256 private ticketIds; // Counter for ticket IDs
    uint256 private eventIds; // Counter for event IDs

    // Structure to hold event details
    struct Event {
        string name;
        uint256 date; // Unix timestamp for the event date
        string venue;
        uint256 ticketPrice; // Price for a single ticket (in wei)
        uint256 totalTickets; // Maximum tickets available for the event
        uint256 ticketsSold; // Tickets sold so far
        bool exists; // Flag to confirm event existence
    }

    // Mapping from eventId to Event details
    mapping(uint256 => Event) public events;
    // Mapping from ticketId to eventId (to know which event a ticket belongs to)
    mapping(uint256 => uint256) public ticketToEvent;

    // Structure for secondary market listings
    struct TicketSale {
        uint256 ticketId;
        uint256 price; // Resale price (in wei)
        address seller;
        bool isListed;
    }
    // Mapping from ticketId to its resale listing
    mapping(uint256 => TicketSale) public ticketSales;

    // Events to log contract activities
    event EventCreated(
        uint256 eventId,
        string name,
        uint256 date,
        string venue,
        uint256 ticketPrice,
        uint256 totalTickets
    );
    event TicketPurchased(uint256 ticketId, uint256 eventId, address buyer);
    event TicketListed(uint256 ticketId, uint256 price, address seller);
    event TicketDelisted(uint256 ticketId);
    event TicketSold(
        uint256 ticketId,
        uint256 price,
        address seller,
        address buyer
    );

    constructor() ERC721("EventTicket", "ETK") Ownable(msg.sender) {}

    /// @notice Create an event. Only the contract owner (organizer) can call this.
    /// @param _name Name of the event.
    /// @param _date Unix timestamp for the event date (must be in the future).
    /// @param _venue Venue of the event.
    /// @param _ticketPrice Price per ticket (in wei).
    /// @param _totalTickets Total number of tickets available.
    function createEvent(
        string memory _name,
        uint256 _date,
        string memory _venue,
        uint256 _ticketPrice,
        uint256 _totalTickets
    ) public onlyOwner {
        require(_date > block.timestamp, "Event date must be in the future");

        // Increment event counter
        eventIds++;
        uint256 newEventId = eventIds;

        events[newEventId] = Event({
            name: _name,
            date: _date,
            venue: _venue,
            ticketPrice: _ticketPrice,
            totalTickets: _totalTickets,
            ticketsSold: 0,
            exists: true
        });

        emit EventCreated(
            newEventId,
            _name,
            _date,
            _venue,
            _ticketPrice,
            _totalTickets
        );
    }

    /// @notice Purchase a ticket for a given event.
    /// @param _eventId ID of the event for which to purchase a ticket.
    function purchaseTicket(uint256 _eventId) public payable {
        Event storage myEvent = events[_eventId];
        require(myEvent.exists, "Event does not exist");
        require(block.timestamp < myEvent.date, "Event already occurred");
        require(myEvent.ticketsSold < myEvent.totalTickets, "All tickets sold");
        require(msg.value >= myEvent.ticketPrice, "Insufficient funds sent");

        // Increment ticket counter and mint a new NFT ticket
        ticketIds++;
        uint256 newTicketId = ticketIds;
        _mint(msg.sender, newTicketId);
        ticketToEvent[newTicketId] = _eventId;

        myEvent.ticketsSold++;

        // Transfer funds to the organizer (contract owner)
        payable(owner()).transfer(msg.value);

        emit TicketPurchased(newTicketId, _eventId, msg.sender);
    }

    /// @notice List a ticket for resale on the secondary market.
    /// @param _ticketId ID of the ticket to list.
    /// @param _price Resale price (in wei).
    function listTicketForSale(uint256 _ticketId, uint256 _price) public {
        require(
            ownerOf(_ticketId) == msg.sender,
            "Caller is not the ticket owner"
        );
        require(_price > 0, "Price must be greater than zero");

        ticketSales[_ticketId] = TicketSale({
            ticketId: _ticketId,
            price: _price,
            seller: msg.sender,
            isListed: true
        });

        // Approve the contract to transfer the ticket on behalf of the seller
        approve(address(this), _ticketId);

        emit TicketListed(_ticketId, _price, msg.sender);
    }

    /// @notice Delist a ticket from the secondary market.
    /// @param _ticketId ID of the ticket to delist.
    function delistTicket(uint256 _ticketId) public {
        TicketSale storage sale = ticketSales[_ticketId];
        require(sale.isListed, "Ticket is not listed for sale");
        require(sale.seller == msg.sender, "Caller is not the seller");

        sale.isListed = false;
        emit TicketDelisted(_ticketId);
    }

    /// @notice Purchase a ticket that has been listed for resale.
    /// @param _ticketId ID of the listed ticket.
    function purchaseListedTicket(uint256 _ticketId) public payable {
        TicketSale storage sale = ticketSales[_ticketId];
        require(sale.isListed, "Ticket is not listed for sale");
        require(msg.value >= sale.price, "Insufficient funds sent");

        address seller = sale.seller;
        // Transfer the NFT ticket from the seller to the buyer
        _transfer(seller, msg.sender, _ticketId);
        sale.isListed = false;

        // Transfer the payment to the seller
        payable(seller).transfer(msg.value);

        emit TicketSold(_ticketId, sale.price, seller, msg.sender);
    }
}
