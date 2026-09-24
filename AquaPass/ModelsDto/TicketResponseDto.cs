namespace AquaPass.ModelsDto
{
    public record TicketResponseDto(
        Guid TicketId,
        string TicketCode,           
        string EntranceType,          
        decimal EntrancePrice,        
        string Status,          // "Active" / "Used"

        bool HasSunbed,               
        string? SunbedDetails,       
        decimal? SunbedPrice,       

        decimal TotalTicketPrice 
    );
}