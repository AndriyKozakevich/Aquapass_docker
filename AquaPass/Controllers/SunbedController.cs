using AquaPass.ModelsDto;
using AquaPass.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AquaPass.Extensions;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using AquaPass.Hubs;

namespace AquaPass.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SunbedController : ControllerBase
    {
        private readonly SunbedService _sunbedService;
        private readonly IHubContext<SunbedHub> _hubContext;
        private readonly ISunbedHoldService _holdService;
        private readonly ILogger<SunbedController> _logger;

        public SunbedController(
            SunbedService sunbedService,
            IHubContext<SunbedHub> hubContext,
            ISunbedHoldService holdService,
            ILogger<SunbedController> logger
            )
        {
            _sunbedService = sunbedService;
            _hubContext = hubContext;
            _holdService = holdService;
            _logger = logger;
        }

        #region GET Operations

        // GET: api/Sunbed
        [AllowAnonymous]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var sunbeds = await _sunbedService.GetAllAsync();

            return Ok(sunbeds);
        }

        // GET: api/Sunbed/{id}
        [AllowAnonymous]
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var invalid = this.ValidateId(id, nameof(id));
            if (invalid != null) return invalid;
            try
            {
                var sunbed = await _sunbedService.GetByIdAsync(id);

                return Ok(sunbed);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        // GET: api/Sunbed/available
        [AllowAnonymous]
        [HttpGet("available")]
        public async Task<IActionResult> GetAvailable(DateTime visitDate)
        {
            var sunbeds = await _sunbedService.GetAvailableSunbedsAsync(visitDate);

            return Ok(sunbeds);
        }

        // GET: api/Sunbed/row/{row}
        [AllowAnonymous]
        [HttpGet("row/{row}")]
        public async Task<IActionResult> GetByRow(string row)
        {
            var sunbeds = await _sunbedService.GetByRowAsync(row);

            return Ok(sunbeds);
        }

        // GET: api/Sunbed/search?row=A&number=5
        [AllowAnonymous]
        [HttpGet("search")]
        public async Task<IActionResult> GetByRowAndNumber([FromQuery] string row, [FromQuery] int number)
        {
            var sunbeds = await _sunbedService.GetByRowAndNumberAsync(row, number);

            return Ok(sunbeds);
        }

        #endregion

        #region POST Operations

        // POST: api/Sunbed
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] SunbedCreateDto dto)
        {
            var createdSunbed = await _sunbedService.CreateAsync(dto);

            return CreatedAtAction(nameof(GetById), new { id = createdSunbed.Id }, createdSunbed);
        }

        // POST: api/Sunbed/range?row=A&count=10
        [Authorize]
        [HttpPost("range")]
        public async Task<IActionResult> CreateRange([FromQuery] string row, [FromQuery] int count)
        {
            await _sunbedService.CreateRangeAsync(row, count);

            return Ok(new { message = $"Успішно створено {count} шезлонгів у ряду {row}." });
        }

        #endregion

        #region PUT / PATCH Operations

        // PUT: api/Sunbed/{id}
        [Authorize]
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] SunbedUpdateDto dto)
        {
            var invalid = this.ValidateId(id, nameof(id));
            if (invalid != null)
            {
                return invalid;
            }

            try
            {
                await _sunbedService.UpdateAsync(id, dto);

                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        #endregion

        #region DELETE Operations

        // DELETE: api/Sunbed/{id}
        [Authorize]
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            try
            {
                await _sunbedService.DeleteAsync(id);

                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        #endregion
        [HttpPost("{id:guid}/hold")]
        public async Task<IActionResult> HoldSunbed(Guid id, [FromBody] HoldSunbedRequest req)
        {
            var invalid = this.ValidateId(id, nameof(id));

            if (invalid != null)
            {
                return invalid;
            }

            if (string.IsNullOrWhiteSpace(req.HoldToken))
            {
                return BadRequest(new { message = "Необхідний holdToken сесії" });
            }

            // Блокуємо рівно на 5 хвилин
            var locked = await _holdService.HoldSunbedAsync(id, req.VisitDate, req.HoldToken, TimeSpan.FromMinutes(5));

            if (!locked)
            {
                return Conflict(new { message = "Шезлонг вже обраний або оформлюється іншим відвідувачем" });
            }

            var dateGroup = req.VisitDate.ToString("yyyy-MM-dd");
            await _hubContext.Clients.Group(dateGroup).SendAsync("SunbedStatusUpdated", new
            {
                sunbedId = id,
                isAvailable = false,
                heldByToken = req.HoldToken
            });

            return Ok(new { message = "Шезлонг заблоковано на 5 хвилин", expiresMinutes = 5 });
        }

        [AllowAnonymous]
        [HttpPost("{id:guid}/release-hold")]
        public async Task<IActionResult> ReleaseHold(Guid id, [FromBody] HoldSunbedRequest req)
        {
            var invalid = this.ValidateId(id, nameof(id));

            if (invalid != null)
            {
                return invalid;
            }

            await _holdService.ReleaseHoldAsync(id, req.VisitDate, req.HoldToken);

            var dateGroup = req.VisitDate.ToString("yyyy-MM-dd");
            await _hubContext.Clients.Group(dateGroup).SendAsync("SunbedStatusUpdated", new
            {
                sunbedId = id,
                isAvailable = true,
                heldByToken = string.Empty
            });

            return Ok(new { message = "Блокування знято" });
        }

    }
}