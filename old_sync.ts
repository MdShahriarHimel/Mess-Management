async function doActualSync(cache: DatabaseSchema) {
  const startTime = Date.now();
  console.log(`[TRACE D - doActualSync()] started`);
  try {
    if (cache.members.length > 0) {
      const activeMemberIds = cache.members.map(m => m.id);
      if (activeMemberIds.length > 0) {
        await db.delete(membersTable).where(notInArray(membersTable.id, activeMemberIds));
      }

      for (const item of cache.members) {
        await db.insert(membersTable).values({
          id: item.id,
          name: item.name,
          nickname: item.nickname,
          email: item.email,
          phone: item.phone,
          whatsapp: item.whatsapp,
          bloodGroup: item.bloodGroup,
          occupation: item.occupation,
          joiningDate: item.joiningDate,
          leavingDate: item.leavingDate || null,
          role: item.role,
          status: item.status,
          notes: item.notes,
          photo: item.photo || null,
          assignedTask: item.assignedTask || null,
          glow: item.glow || false,
          glowStyle: item.glowStyle || null,
          animation: item.animation || null,
          splitProfile: item.splitProfile || false,
          memberGlow: item.memberGlow || false,
          memberGlowStyle: item.memberGlowStyle || null,
          memberAnimation: item.memberAnimation || null,
          gifEnabledByAdmin: item.gifEnabledByAdmin !== false,
          hideContactInfoByAdmin: item.hideContactInfoByAdmin ?? false,
          glowEnabledByAdmin: item.glowEnabledByAdmin ?? false,
          hideAdminRole: item.hideAdminRole ?? false,
          hideCardFromDirectoryByAdmin: item.hideCardFromDirectoryByAdmin ?? false,
          personalTheme: item.personalTheme || null,
          personalFont: item.personalFont || null,
          avatarFrame: item.avatarFrame || null,
          badge: item.badge || null,
          profileBackground: item.profileBackground || null,
          dashboardLayout: item.dashboardLayout || null,
          profileDecoration: item.profileDecoration || null,
          dashboardStyle: item.dashboardStyle || null,
          backgroundEffect: item.backgroundEffect || null,
        }).onConflictDoUpdate({
          target: membersTable.id,
          set: {
            name: item.name,
            nickname: item.nickname,
            email: item.email,
            phone: item.phone,
            whatsapp: item.whatsapp,
            bloodGroup: item.bloodGroup,
            occupation: item.occupation,
            joiningDate: item.joiningDate,
            leavingDate: item.leavingDate || null,
            role: item.role,
            status: item.status,
            notes: item.notes,
            photo: item.photo || null,
            assignedTask: item.assignedTask || null,
            glow: item.glow || false,
            glowStyle: item.glowStyle || null,
            animation: item.animation || null,
            splitProfile: item.splitProfile || false,
            memberGlow: item.memberGlow || false,
            memberGlowStyle: item.memberGlowStyle || null,
            memberAnimation: item.memberAnimation || null,
            gifEnabledByAdmin: item.gifEnabledByAdmin !== false,
            hideContactInfoByAdmin: item.hideContactInfoByAdmin ?? false,
            glowEnabledByAdmin: item.glowEnabledByAdmin ?? false,
            hideAdminRole: item.hideAdminRole ?? false,
            hideCardFromDirectoryByAdmin: item.hideCardFromDirectoryByAdmin ?? false,
            personalTheme: item.personalTheme || null,
            personalFont: item.personalFont || null,
            avatarFrame: item.avatarFrame || null,
            badge: item.badge || null,
            profileBackground: item.profileBackground || null,
            dashboardLayout: item.dashboardLayout || null,
            profileDecoration: item.profileDecoration || null,
            dashboardStyle: item.dashboardStyle || null,
            backgroundEffect: item.backgroundEffect || null,
          }
        });
      }
    }

    if (cache.months.length > 0) {
      for (const item of cache.months) {
        await db.insert(monthsTable).values({
          id: item.id,
          name: item.name,
          startDate: item.startDate,
          endDate: item.endDate,
          isLocked: item.isLocked,
          gracePeriodEnabled: item.gracePeriodEnabled,
        }).onConflictDoUpdate({
          target: monthsTable.id,
          set: {
            name: item.name,
            startDate: item.startDate,
            endDate: item.endDate,
            isLocked: item.isLocked,
            gracePeriodEnabled: item.gracePeriodEnabled,
          }
        });
      }
      
      const activeMonthIds = cache.months.map(m => m.id);
      if (activeMonthIds.length > 0) {
        await db.delete(monthsTable).where(notInArray(monthsTable.id, activeMonthIds));
      }
    }

    // Clean up dynamic tables and bulk insert
    await db.execute(sql`DELETE FROM meals;`);
    await db.execute(sql`DELETE FROM food_menus;`);
    await db.execute(sql`DELETE FROM market_entries;`);
    await db.execute(sql`DELETE FROM deposits;`);
    await db.execute(sql`DELETE FROM bills;`);
    await db.execute(sql`DELETE FROM duties;`);
    await db.execute(sql`DELETE FROM manager_holdings;`);
    await db.execute(sql`DELETE FROM manager_ratings;`);
    await db.execute(sql`DELETE FROM notices;`);
    await db.execute(sql`DELETE FROM audit_logs;`);
    try {
      await db.execute(sql`DELETE FROM meal_requests;`);
    } catch (e) {
      console.warn("Could not delete from meal_requests table:", e);
    }

    if (cache.meals.length > 0) {
       await db.insert(mealsTable).values(cache.meals.map(item => ({
         id: item.id,
         monthId: item.monthId,
         memberId: item.memberId,
         date: item.date,
         lunch: item.lunch,
         dinner: item.dinner,
         breakfast: item.breakfast || 0,
       })));
     }

    if (cache.foodMenus.length > 0) {
      await db.insert(foodMenusTable).values(cache.foodMenus.map(item => ({
        id: item.id,
        monthId: item.monthId,
        date: item.date,
        lunchVegetable: item.lunchVegetable,
        lunchMain: item.lunchMain,
        dinnerVegetable: item.dinnerVegetable,
        dinnerMain: item.dinnerMain,
      })));
    }

    if (cache.marketEntries.length > 0) {
      await db.insert(marketEntriesTable).values(cache.marketEntries.map(item => ({
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        date: item.date,
        amount: item.amount,
        receiptUrl: item.receiptUrl,
        description: item.description,
        isExtra: item.isExtra,
        quantity: item.quantity || ""
      })));
    }

    if (cache.deposits.length > 0) {
      await db.insert(depositsTable).values(cache.deposits.map(item => ({
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        amount: item.amount,
        date: item.date,
        enteredBy: item.enteredBy,
      })));
    }

    if (cache.bills.length > 0) {
      await db.insert(billsTable).values(cache.bills.map(item => ({
        id: item.id,
        monthId: item.monthId,
        name: item.name,
        amount: item.amount,
        collectorId: item.collectorId,
        status: item.status,
      })));
    }

    if (cache.duties.length > 0) {
      await db.insert(dutiesTable).values(cache.duties.map(item => ({
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        name: item.name,
        task: item.task,
      })));
    }

    if (cache.managerHoldings.length > 0) {
      await db.insert(managerHoldingsTable).values(cache.managerHoldings.map(item => ({
        id: item.id,
        monthId: item.monthId,
        memberId: item.memberId,
        amount: item.amount,
        marketSpent: item.marketSpent || 0,
        description: item.description || "",
      })));
    }

    if (cache.managerRatings.length > 0) {
      await db.insert(managerRatingsTable).values(cache.managerRatings.map(item => ({
        id: item.id,
        monthId: item.monthId,
        rating: item.rating,
        raterId: item.raterId,
        date: item.date,
      })));
    }

    if (cache.notices.length > 0) {
      await db.insert(noticesTable).values(cache.notices.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        pinned: item.pinned,
        archived: item.archived,
        authorId: item.authorId,
        authorName: item.authorName,
        date: item.date,
      })));
    }

    if (cache.auditLogs.length > 0) {
      await db.insert(auditLogsTable).values(cache.auditLogs.map(item => ({
        id: item.id,
        userId: item.userId,
        userName: item.userName,
        action: item.action,
        oldValue: item.oldValue,
        newValue: item.newValue,
        timestamp: item.timestamp,
        reason: item.reason,
        date: item.date || null,
        time: item.time || null,
        userRole: item.userRole || null,
        superUserId: item.superUserId || null,
        messId: item.messId || null,
        module: item.module || null,
        actionType: item.actionType || null,
        description: item.description || null,
        browser: item.browser || null,
        ipAddress: item.ipAddress || null,
      })));
    }

    if (cache.mealRequests && cache.mealRequests.length > 0) {
      try {
        await db.insert(mealRequestsTable).values(cache.mealRequests.map(item => ({
          id: item.id,
          monthId: item.monthId,
          date: item.date,
          requesterId: item.requesterId,
          requesterName: item.requesterName,
          mealsData: item.mealsData,
          status: item.status,
          timestamp: item.timestamp,
        })));
      } catch (err) {
        console.warn("Could not insert into meal_requests table during sync:", err);
      }
    }
  } catch (error) {
    console.error("Error in background PostgreSQL sync:", error);
  }
  console.log(`[TRACE D - doActualSync()] finished (${Date.now() - startTime} ms)`);
