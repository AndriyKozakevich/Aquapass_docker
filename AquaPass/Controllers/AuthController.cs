using AquaPass.ModelsDto;
using AquaPass.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace AquaPass.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] StaffLoginDto dto)
    {
        _logger.LogInformation("Login attempt for staff {Email}", dto.Email);
        var response = await _authService.LoginAsync(dto);

        if (response == null)
        {
            _logger.LogWarning("Login failed for staff {Email}", dto.Email);
            return Unauthorized(new { message = "Невірний email або пароль." });
        }

        _logger.LogInformation("Login succeeded for staff {Email} with role {Role}", response.Email, response.Role);
        return Ok(response);
    }

    
}