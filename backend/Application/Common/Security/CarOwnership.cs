using Application.Common.Exceptions;
using Application.Common.Interfaces;
using Domain.Car;
using Domain.User;

namespace Application.Common.Security;

/// <summary>
/// Who may change a car and its photos.
///
/// The three image commands — upload, delete, and now set-cover — were the
/// only state-changing car operations carrying no authorization at all: any
/// caller could upload to, or delete from, any car on the platform.
/// <c>CreateCar</c>, <c>UpdateCar</c> and <c>DeleteCar</c> have always checked
/// the same way, inline; this is that check, in one place.
///
/// Admin and Staff pass by role, as they do everywhere else in this codebase.
/// </summary>
public static class CarOwnership
{
    public static void EnsureCanManage(Car car, ICurrentUserService currentUser)
    {
        var role = currentUser.Role;
        if (role == UserRole.Admin.ToString() || role == UserRole.Staff.ToString())
        {
            return;
        }

        if (car.OwnerId != currentUser.UserId)
        {
            throw new ForbiddenAccessException();
        }
    }
}
