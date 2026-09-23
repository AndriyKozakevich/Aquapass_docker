using System;
using System.Collections.Generic;
using System.Net;
using System.Threading.Tasks;
using AquaPass.Services;
using FluentAssertions;
using Moq;
using StackExchange.Redis;
using Xunit;

namespace AquaPass.Tests
{
    public class SunbedHoldServiceTests
    {
        private readonly Mock<IConnectionMultiplexer> _redisMock;
        private readonly Mock<IDatabase> _dbMock;
        private readonly Mock<IServer> _serverMock;
        private readonly EndPoint _fakeEndpoint;

        public SunbedHoldServiceTests()
        {
            _redisMock = new Mock<IConnectionMultiplexer>();
            _dbMock = new Mock<IDatabase>();
            _serverMock = new Mock<IServer>();

            _fakeEndpoint = new DnsEndPoint("localhost", 6379);

            _redisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>()))
                .Returns(_dbMock.Object);

            _redisMock.Setup(r => r.GetEndPoints(It.IsAny<bool>()))
                .Returns(new[] { _fakeEndpoint });

            _redisMock.Setup(r => r.GetServer(_fakeEndpoint, It.IsAny<object>()))
                .Returns(_serverMock.Object);
        }

        private SunbedHoldService CreateSut()
        {
            return new SunbedHoldService(_redisMock.Object);
        }

        #region Constructor Tests

        [Fact]
        public void Constructor_WhenNoEndpointsAvailable_ShouldThrowInvalidOperationException()
        {
            // Arrange
            var redisMock = new Mock<IConnectionMultiplexer>();
            redisMock.Setup(r => r.GetEndPoints(It.IsAny<bool>()))
                .Returns(Array.Empty<EndPoint>());

            // Act
            Action act = () => new SunbedHoldService(redisMock.Object);

            // Assert
            act.Should().Throw<InvalidOperationException>()
                .WithMessage("*No Redis endpoints available*");
        }

        #endregion

        #region HoldSunbedAsync Tests

        [Fact]
        public async Task HoldSunbedAsync_WhenAlreadyHeldBySomeoneElse_ShouldReturnFalseAndNotModifySet()
        {
            // Arrange
            var sut = CreateSut();
            var sunbedId = Guid.NewGuid();
            var visitDate = DateTime.UtcNow.Date;
            const string token = "user-hold-token-123";
            var duration = TimeSpan.FromMinutes(5);

            _dbMock.Setup(db => db.StringSetAsync(
        It.IsAny<RedisKey>(),
        It.IsAny<RedisValue>(),
        It.IsAny<TimeSpan?>(),
        When.NotExists,
        CommandFlags.None))
    .ReturnsAsync(false);

            // Act
            var result = await sut.HoldSunbedAsync(sunbedId, visitDate, token, duration);

            // Assert
            result.Should().BeFalse();

            _dbMock.Verify(db => db.SetAddAsync(It.IsAny<RedisKey>(), It.IsAny<RedisValue>(), CommandFlags.None), Times.Never);
            _dbMock.Verify(db => db.KeyExpireAsync(It.IsAny<RedisKey>(), It.IsAny<TimeSpan?>(), CommandFlags.None), Times.Never);
        }

        #endregion

        #region ReleaseHoldAsync Tests

        [Fact]
        public async Task ReleaseHoldAsync_ShouldInvokeLuaScriptWithKeysAndArgs()
        {
            // Arrange
            var sut = CreateSut();
            var sunbedId = Guid.NewGuid();
            var visitDate = new DateTime(2026, 9, 25, 0, 0, 0, DateTimeKind.Utc);
            const string token = "user-hold-token-123";

            // Act
            await sut.ReleaseHoldAsync(sunbedId, visitDate, token);

            // Assert
            _dbMock.Verify(db => db.ScriptEvaluateAsync(
                It.Is<string>(s => s.Contains("redis.call('get', KEYS[1])") && s.Contains("redis.call('srem', KEYS[2], ARGV[2])")),
                It.Is<RedisKey[]>(keys =>
                    keys.Length == 2 &&
                    keys[0].ToString().Contains($"hold:sunbed:20260925:{sunbedId}") &&
                    keys[1].ToString().Contains("hold:sunbed:set:20260925")),
                It.Is<RedisValue[]>(values =>
                    values.Length == 2 &&
                    values[0] == token &&
                    values[1] == sunbedId.ToString()),
                CommandFlags.None), Times.Once);
        }

        #endregion

        #region GetHeldSunbedIdsAsync Tests

        [Fact]
        public async Task GetHeldSunbedIdsAsync_WhenInvalidGuidInSet_ShouldRemoveEntryFromSet()
        {
            // Arrange
            var sut = CreateSut();
            var visitDate = DateTime.UtcNow.Date;
            const string invalidMember = "not-a-valid-guid";

            _dbMock.Setup(db => db.SetMembersAsync(It.IsAny<RedisKey>(), CommandFlags.None))
                .ReturnsAsync(new RedisValue[] { invalidMember });

            // Act
            var result = await sut.GetHeldSunbedIdsAsync(visitDate, null);

            // Assert
            result.Should().BeEmpty();

            _dbMock.Verify(db => db.SetRemoveAsync(
                It.IsAny<RedisKey>(),
                invalidMember,
                CommandFlags.None), Times.Once);
        }

        [Fact]
        public async Task GetHeldSunbedIdsAsync_WhenHoldExpiredInRedis_ShouldRemoveStaleEntryFromSet()
        {
            // Arrange
            var sut = CreateSut();
            var visitDate = DateTime.UtcNow.Date;
            var expiredId = Guid.NewGuid();

            _dbMock.Setup(db => db.SetMembersAsync(It.IsAny<RedisKey>(), CommandFlags.None))
                .ReturnsAsync(new RedisValue[] { expiredId.ToString() });

            // Ключ уже не існує (час вийшов)
            _dbMock.Setup(db => db.KeyExistsAsync(It.Is<RedisKey>(k => k.ToString().Contains(expiredId.ToString())), CommandFlags.None))
                .ReturnsAsync(false);

            // Act
            var result = await sut.GetHeldSunbedIdsAsync(visitDate, null);

            // Assert
            result.Should().BeEmpty();

            _dbMock.Verify(db => db.SetRemoveAsync(
                It.IsAny<RedisKey>(),
                expiredId.ToString(),
                CommandFlags.None), Times.Once);
        }

        [Fact]
        public async Task GetHeldSunbedIdsAsync_WhenHeldByOtherToken_ShouldIncludeInHeldList()
        {
            // Arrange
            var sut = CreateSut();
            var visitDate = DateTime.UtcNow.Date;
            var heldSunbedId = Guid.NewGuid();

            _dbMock.Setup(db => db.SetMembersAsync(It.IsAny<RedisKey>(), CommandFlags.None))
                .ReturnsAsync(new RedisValue[] { heldSunbedId.ToString() });

            _dbMock.Setup(db => db.KeyExistsAsync(It.IsAny<RedisKey>(), CommandFlags.None))
                .ReturnsAsync(true);

            _dbMock.Setup(db => db.StringGetAsync(It.IsAny<RedisKey>(), CommandFlags.None))
                .ReturnsAsync("another-user-token");

            // Act
            var result = await sut.GetHeldSunbedIdsAsync(visitDate, "my-session-token");

            // Assert
            result.Should().ContainSingle();
            result.Should().Contain(heldSunbedId);
        }

        [Fact]
        public async Task GetHeldSunbedIdsAsync_WhenHeldByCurrentToken_ShouldNotIncludeInHeldList()
        {
            // Arrange
            var sut = CreateSut();
            var visitDate = DateTime.UtcNow.Date;
            var mySunbedId = Guid.NewGuid();
            const string myToken = "my-session-token";

            _dbMock.Setup(db => db.SetMembersAsync(It.IsAny<RedisKey>(), CommandFlags.None))
                .ReturnsAsync(new RedisValue[] { mySunbedId.ToString() });

            _dbMock.Setup(db => db.KeyExistsAsync(It.IsAny<RedisKey>(), CommandFlags.None))
                .ReturnsAsync(true);

            _dbMock.Setup(db => db.StringGetAsync(It.IsAny<RedisKey>(), CommandFlags.None))
                .ReturnsAsync(myToken);

            // Act
            var result = await sut.GetHeldSunbedIdsAsync(visitDate, myToken);

            // Assert
            result.Should().BeEmpty();
        }

        [Fact]
        public async Task GetHeldSunbedIdsAsync_WhenCurrentTokenIsNull_ShouldIncludeAllActiveHolds()
        {
            // Arrange
            var sut = CreateSut();
            var visitDate = DateTime.UtcNow.Date;
            var sunbedId1 = Guid.NewGuid();
            var sunbedId2 = Guid.NewGuid();

            _dbMock.Setup(db => db.SetMembersAsync(It.IsAny<RedisKey>(), CommandFlags.None))
                .ReturnsAsync(new RedisValue[] { sunbedId1.ToString(), sunbedId2.ToString() });

            _dbMock.Setup(db => db.KeyExistsAsync(It.IsAny<RedisKey>(), CommandFlags.None))
                .ReturnsAsync(true);

            // Act
            var result = await sut.GetHeldSunbedIdsAsync(visitDate, currentHoldToken: null);

            // Assert
            result.Should().HaveCount(2);
            result.Should().Contain(new[] { sunbedId1, sunbedId2 });
        }

        #endregion
    }
}